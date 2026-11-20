import { Platform, NativeModules } from 'react-native';

/**
 * Where the NestJS backend lives.
 *
 * This is the one piece of configuration that trips people up, so it tries to
 * work it out rather than defaulting to something that will fail silently:
 *
 *   1. EXPO_PUBLIC_API_URL wins if you set it. Use this for a deployed API.
 *   2. Otherwise, on a device or simulator, we read the host that Metro itself
 *      is being served from. Expo already knows your machine's LAN address,
 *      because the app had to download the bundle from it, so reusing that host
 *      lands on the same machine the backend is running on.
 *   3. Android emulators reach the host machine at 10.0.2.2, never localhost.
 *   4. Plain localhost as a last resort, which is correct for web.
 *
 * `localhost` on a physical phone means the phone itself, which is why a
 * hardcoded localhost is the usual reason "it works on web but not on my
 * phone".
 */

const DEFAULT_PORT = 3001;

function hostFromMetro(): string | null {
  // scriptURL looks like http://192.168.0.12:8081/index.bundle?...
  const scriptURL: string | undefined = NativeModules?.SourceCode?.getConstants?.().scriptURL;
  if (!scriptURL) return null;
  const match = /^https?:\/\/([^/:]+)(?::\d+)?/.exec(scriptURL);
  return match ? match[1] : null;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (Platform.OS === 'web') {
    return `http://localhost:${DEFAULT_PORT}`;
  }

  const host = hostFromMetro();
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEFAULT_PORT}`;
  }

  if (Platform.OS === 'android') {
    // The emulator's alias for the host machine.
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

/** Turns a /uploads/... path from the API into something Image can load. */
export function absoluteUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
