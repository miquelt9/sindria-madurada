const VITE_PORTS = new Set(['', '80', '443', '5173', '5174', '4173', '4174']);

function isPrivateOrLocalHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }
  if (hostname.endsWith('.local')) {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  return false;
}

function extraAllowedOrigins(): Set<string> {
  const raw = process.env.CORS_ORIGIN ?? '';
  return new Set(
    raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/** Allow Vite (localhost + LAN HTTP/HTTPS) plus optional CORS_ORIGIN list. */
export function isAllowedOrigin(origin: string): boolean {
  if (!origin) {
    return false;
  }
  if (extraAllowedOrigins().has(origin)) {
    return true;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    if (!isPrivateOrLocalHost(url.hostname)) {
      return false;
    }
    if (VITE_PORTS.has(url.port)) {
      return true;
    }
    // Vite may bump the port if 5173 is taken; still allow LAN/local http(s).
    return true;
  } catch {
    return false;
  }
}

export function corsOrigin(origin: string): string | undefined {
  return isAllowedOrigin(origin) ? origin : undefined;
}
