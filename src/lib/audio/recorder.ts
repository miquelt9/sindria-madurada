import { aggregateKnockFeatures } from './features';
import { FRAME_SIZE, KnockDetector, MAX_KNOCKS } from './onset';
import { AudioFeatures } from '../types';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
};

const STRICT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export class KnockRecorder {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private detector: KnockDetector | null = null;
  private isListening = false;
  private useAnalyserPcm = true;
  private lastAnalyserPushMs = 0;
  private wakeLock: WakeLockSentinelLike | null = null;
  private _liveRms = 0;
  private _noiseFloor = 0.005;

  public onKnockDetected?: (knockNumber: number, maxKnocks: number) => void;
  public onVolumeUpdate?: (volume: number) => void;
  public onSpectrumUpdate?: (frequencyData: Uint8Array) => void;

  get liveRms(): number {
    return this.detector?.liveRms ?? this._liveRms;
  }

  get noiseFloor(): number {
    return this.detector?.noiseFloor ?? this._noiseFloor;
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextCtor();
    // Resume while still in the user-gesture stack, then again after the mic prompt.
    void this.audioContext.resume();

    try {
      this.mediaStream = await this.requestMicrophone();
      await this.audioContext.resume();
    } catch (err) {
      await this.tearDownGraph();
      throw err;
    }

    const sampleRate = this.audioContext.sampleRate;
    this.detector = new KnockDetector(sampleRate);
    this._liveRms = 0;
    this._noiseFloor = this.detector.noiseFloor;
    this.useAnalyserPcm = true;
    this.lastAnalyserPushMs = 0;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.source = source;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FRAME_SIZE;
    this.analyser.smoothingTimeConstant = 0.15;
    source.connect(this.analyser);

    this.attachPcmTap(source);

    this.isListening = true;
    await this.acquireWakeLock();
    this.monitorLoop();
  }

  /** Manual grocery fallback: snapshot the current ring buffer as a knock. */
  captureManualKnock(): boolean {
    if (!this.isListening || !this.detector) return false;
    const captured = this.detector.captureManualKnock();
    if (captured) {
      this.emitKnock();
    }
    return captured;
  }

  stopAndAnalyze(): AudioFeatures {
    const sampleRate = this.audioContext?.sampleRate ?? 44100;
    const spectra = this.detector ? [...this.detector.spectra] : [];

    this.isListening = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    void this.tearDownGraph();

    return aggregateKnockFeatures(spectra, sampleRate);
  }

  getKnockCount(): number {
    return this.detector?.knockCount ?? 0;
  }

  private async requestMicrophone(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: STRICT_AUDIO_CONSTRAINTS });
    } catch {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  }

  private attachPcmTap(source: MediaStreamAudioSourceNode): void {
    if (!this.audioContext) return;
    try {
      const processor = this.audioContext.createScriptProcessor(FRAME_SIZE, 1, 1);
      processor.onaudioprocess = (event) => {
        if (!this.isListening || !this.detector) return;
        this.useAnalyserPcm = false;
        const input = event.inputBuffer.getChannelData(0);
        // Copy: the AudioBuffer channel is reused across callbacks.
        const frame = new Float32Array(input.length);
        frame.set(input);
        this.ingestFrame(frame);
      };

      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.processor = processor;
      this.silentGain = silentGain;
    } catch {
      this.processor = null;
      this.silentGain = null;
      this.useAnalyserPcm = true;
    }
  }

  private ingestFrame(frame: Float32Array): void {
    if (!this.detector) return;
    const detected = this.detector.pushFrame(frame);
    this._liveRms = this.detector.liveRms;
    this._noiseFloor = this.detector.noiseFloor;
    if (detected) {
      this.emitKnock();
    }
  }

  private emitKnock(): void {
    const count = this.getKnockCount();
    this.onKnockDetected?.(count, MAX_KNOCKS);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  private monitorLoop = (): void => {
    if (!this.isListening || !this.analyser) return;

    const freqByteData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqByteData);
    this.onSpectrumUpdate?.(freqByteData);

    if (this.useAnalyserPcm && this.detector && this.audioContext) {
      const now = performance.now();
      const frameMs = (FRAME_SIZE / this.audioContext.sampleRate) * 1000;
      if (now - this.lastAnalyserPushMs >= frameMs * 0.85) {
        this.lastAnalyserPushMs = now;
        const timeDomain = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(timeDomain);
        this.ingestFrame(timeDomain);
      }
    }

    const rms = this.liveRms;
    // Scale so grocery knocks around 0.03 RMS visibly move the bar.
    this.onVolumeUpdate?.(Math.min(1, rms * 18));

    this.animationFrameId = requestAnimationFrame(this.monitorLoop);
  };

  private async acquireWakeLock(): Promise<void> {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock?.request) return;
    try {
      this.wakeLock = await nav.wakeLock.request('screen');
    } catch {
      this.wakeLock = null;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const lock = this.wakeLock;
    this.wakeLock = null;
    if (!lock || lock.released) return;
    try {
      await lock.release();
    } catch {
      // Unsupported or already released (tab backgrounded).
    }
  }

  private async tearDownGraph(): Promise<void> {
    await this.releaseWakeLock();

    const processor = this.processor;
    const silentGain = this.silentGain;
    const source = this.source;
    const mediaStream = this.mediaStream;
    const ctx = this.audioContext;

    this.processor = null;
    this.silentGain = null;
    this.source = null;
    this.analyser = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.detector = null;

    if (processor) {
      processor.onaudioprocess = null;
      try {
        processor.disconnect();
      } catch {
        // already disconnected
      }
    }
    if (silentGain) {
      try {
        silentGain.disconnect();
      } catch {
        // already disconnected
      }
    }
    if (source) {
      try {
        source.disconnect();
      } catch {
        // already disconnected
      }
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }

    if (ctx && ctx.state !== 'closed') {
      try {
        await ctx.close();
      } catch {
        // ignore
      }
    }
  }
}
