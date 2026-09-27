import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../../i18n';
import { ca } from '../../i18n/ca';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';
import { AppShell, AppStep } from './AppShell';
import { ThemeProvider } from './ThemeProvider';
import { ScanStepper } from './ScanStepper';
import { isScanFlowStep, scanStepperItems, ScanFlowStep } from './scanStepperState';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scan stepper state', () => {
  it('is hidden outside the scan flow', () => {
    expect(isScanFlowStep('home')).toBe(false);
    expect(isScanFlowStep('history')).toBe(false);
    expect(isScanFlowStep('photo')).toBe(true);
    expect(isScanFlowStep('knock')).toBe(true);
    expect(isScanFlowStep('result')).toBe(true);
  });

  it('marks the current step and treats earlier steps as completed', () => {
    expect(scanStepperItems('photo').map((item) => item.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(scanStepperItems('knock').map((item) => item.status)).toEqual([
      'completed',
      'current',
      'upcoming',
    ]);
    expect(scanStepperItems('result').map((item) => item.status)).toEqual([
      'completed',
      'completed',
      'current',
    ]);
  });
});

describe('scan stepper copy', () => {
  it('has a short label for each step in ca, es, and en', () => {
    for (const dict of [ca, es, en]) {
      expect(dict.scanStepperLabel.length).toBeGreaterThan(0);
      expect(dict.scanStepPhoto.length).toBeGreaterThan(0);
      expect(dict.scanStepKnock.length).toBeGreaterThan(0);
      expect(dict.scanStepResult.length).toBeGreaterThan(0);
    }
    expect(en.scanStepPhoto).toBe('Photo');
    expect(en.scanStepKnock).toBe('Knock');
    expect(en.scanStepResult).toBe('Result');
  });
});

function renderShell(step: AppStep): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <ThemeProvider>
        <AppShell currentStep={step} onNavigateHome={() => {}} onToggleHistory={() => {}}>
          <p>content</p>
        </AppShell>
      </ThemeProvider>
    </I18nProvider>
  );
}

function stepperNav(html: string): string | null {
  const match = html.match(/<nav\b[^>]*data-scan-stepper[^>]*>[\s\S]*?<\/nav>/);
  return match?.[0] ?? null;
}

describe('ScanStepper in AppShell', () => {
  it('shows Photo as current and does not make steps clickable', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'sindria.lang' ? 'en' : null),
      setItem: () => {},
      removeItem: () => {},
    });

    const nav = stepperNav(renderShell('photo'));
    expect(nav).toBeTruthy();
    expect(nav).toContain('Photo');
    expect(nav).toContain('Knock');
    expect(nav).toContain('Result');
    expect(nav).toContain('data-step="photo"');
    expect(nav).toContain('data-status="current"');
    expect(nav).toContain('aria-current="step"');
    expect(nav).toContain('data-step="knock"');
    expect(nav).toContain('data-status="upcoming"');
    expect(nav).toContain('data-step="result"');
    expect(nav).not.toContain('<button');
    expect(nav).not.toContain('<a ');
    expect(nav?.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it.each([
    ['knock', ['completed', 'current', 'upcoming']],
    ['result', ['completed', 'completed', 'current']],
  ] as const)('reflects progress on %s', (step, statuses) => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'sindria.lang' ? 'en' : null),
      setItem: () => {},
      removeItem: () => {},
    });

    const nav = stepperNav(renderShell(step));
    expect(nav).toBeTruthy();
    for (const [index, flowStep] of (['photo', 'knock', 'result'] as ScanFlowStep[]).entries()) {
      expect(nav).toContain(`data-step="${flowStep}" data-status="${statuses[index]}"`);
    }
  });

  it.each(['home', 'history'] as const)('hides the stepper on %s', (step) => {
    expect(stepperNav(renderShell(step))).toBeNull();
  });

  it('renders the English labels for a known step', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'sindria.lang' ? 'en' : null),
      setItem: () => {},
      removeItem: () => {},
    });

    const html = renderToStaticMarkup(
      <I18nProvider>
        <ScanStepper currentStep="knock" />
      </I18nProvider>
    );
    expect(html).toContain('Photo');
    expect(html).toContain('Knock');
    expect(html).toContain('Result');
    expect(html).not.toContain('<button');
  });
});
