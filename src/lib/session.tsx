import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useState } from 'react';
import { Platform } from 'react-native';

import { api, ApiException, Json, setToken } from './api';

// Merkt sich das Login-Token auf dem Gerät (Handy: SecureStore, Web:
// localStorage), damit man nach einem Neustart angemeldet bleibt.
//
//   Login    → saveSession(token)
//   Start    → restoreSession() und GET /users/me
//   Abmelden → logout()
const KEY = 'session_token';

async function read(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch {
      // Speicher gesperrt (z. B. privates Fenster): nur für diese Sitzung angemeldet.
    }
    return;
  }
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
}

// Lädt das gespeicherte Token und liefert den Benutzer, oder null, wenn
// keins da ist oder es nicht mehr gilt.
export async function restoreSession(): Promise<Json | null> {
  const saved = await read();
  if (!saved) return null;
  setToken(saved);
  try {
    return await api.getJson('/users/me');
  } catch (e) {
    if (e instanceof ApiException && e.statusCode === 401) {
      await clearSession(); // abgelaufen oder abgemeldet
      return null;
    }
    throw e; // Server nicht erreichbar: Token behalten
  }
}

export async function saveSession(token: string): Promise<void> {
  setToken(token);
  await write(token);
}

export async function clearSession(): Promise<void> {
  setToken(null);
  await write(null);
}

// Meldet beim Server ab (Token wird dort ungültig) und vergisst es hier.
export async function logout(): Promise<void> {
  try {
    await api.postJson('/users/logout');
  } catch {
    // Lokal trotzdem abmelden.
  }
  await clearSession();
}

// Angemeldeter Benutzer für alle Seiten (Profil ändern → überall neu).
type SessionValue = { user: Json | null; setUser: (u: Json | null) => void };
const SessionContext = createContext<SessionValue>({ user: null, setUser: () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Json | null>(null);
  return <SessionContext.Provider value={{ user, setUser }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
