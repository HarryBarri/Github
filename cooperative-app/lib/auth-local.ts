/**
 * Client-side auth using localStorage/sessionStorage.
 * No bcrypt — password comparison is direct string equality
 * (acceptable for a demo/offline app).
 */

import { localDb } from "./local-db";

export interface CoopSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  memberId: string | null;
}

const SESSION_KEY = "coop_session";

export function getSession(): CoopSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoopSession;
  } catch {
    return null;
  }
}

export function setSession(session: CoopSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function login(email: string, password: string): CoopSession | null {
  localDb.init();
  const user = localDb.users.findFirst({ email } as never);
  if (!user) return null;
  if (user.passwordHash !== password) return null;
  if (!user.isActive) return null;

  const session: CoopSession = {
    userId: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
    memberId: user.memberId,
  };
  setSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}
