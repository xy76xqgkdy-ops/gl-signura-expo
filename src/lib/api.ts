import { Platform } from 'react-native';

// Fehler mit einer Meldung, die man dem Benutzer zeigen kann.
export class ApiException extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiException ? e.message : 'Es gibt ein Problem bei uns. Bitte versuchen Sie es später noch einmal.';
}

// Adresse der booin-API:
//   Web-App auf gl.signura.de → "/api" (gleiche Adresse, kein CORS nötig)
//   sonst (Expo Go, Handy)    → https://gl.signura.de/api
// Überschreibbar mit EXPO_PUBLIC_API_BASE=https://… (z. B. in .env.local).
export function baseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_BASE;
  if (override) return override;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.host === 'gl.signura.de') {
    return '/api';
  }
  return 'https://gl.signura.de/api';
}

// Token der Sitzung (siehe session.ts). Ist es gesetzt, geht es bei jeder
// Anfrage als "Authorization: Bearer …" mit.
let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};
export const getToken = () => token;

export type Json = Record<string, any>;

function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    return await fetch(baseUrl() + path, {
      ...init,
      headers: { ...authHeaders(), ...(init.headers as Record<string, string>) },
      signal: ctrl.signal,
    });
  } catch {
    if (ctrl.signal.aborted) {
      throw new ApiException('Keine Antwort vom Server. Bitte versuchen Sie es später noch einmal.');
    }
    throw new ApiException('Keine Verbindung. Bitte prüfen Sie Ihr Internet.');
  } finally {
    clearTimeout(timer);
  }
}

async function send(path: string, init: RequestInit = {}): Promise<any> {
  const res = await raw(path, init);
  let data: any;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // Kein JSON (z. B. 502/504 von nginx) → allgemeine Meldung unten.
  }
  if (res.ok) return data;
  const err = data && typeof data.error === 'string' ? data.error : `Fehler (HTTP ${res.status})`;
  throw new ApiException(err, res.status);
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {}),
});

const asObject = (d: unknown): Json => (d && typeof d === 'object' && !Array.isArray(d) ? (d as Json) : {});

export const api = {
  async getJson(path: string): Promise<Json> {
    return asObject(await send(path));
  },

  // Für Endpunkte, die eine Liste liefern (z. B. GET /me/requests).
  async getJsonList(path: string, query?: Record<string, string>): Promise<Json[]> {
    const qs = query && Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : '';
    const data = await send(path + qs);
    return Array.isArray(data) ? data.filter((x) => x && typeof x === 'object') : [];
  },

  async postJson(path: string, body?: unknown): Promise<Json> {
    return asObject(await send(path, jsonInit('POST', body)));
  },

  async putJson(path: string, body?: unknown): Promise<Json> {
    return asObject(await send(path, jsonInit('PUT', body)));
  },

  async deleteJson(path: string): Promise<void> {
    await send(path, { method: 'DELETE' });
  },

  // Binärdaten laden (z. B. Profilbild) als Base64; null bei 404.
  async getBase64(path: string): Promise<string | null> {
    const res = await raw(path);
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiException(`Fehler (HTTP ${res.status})`, res.status);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  },

  // Binärdaten hochladen (z. B. Profilbild) mit passendem Content-Type.
  async putBase64(path: string, base64: string, contentType: string): Promise<void> {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    await send(path, { method: 'PUT', headers: { 'Content-Type': contentType }, body: bytes });
  },
};
