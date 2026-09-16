import type { Session, User } from '@/types';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import { delay, read, ServiceError, write } from './db';

/**
 * Mock authentication. This is the ONLY file that knows how a user is
 * identified — swapping in Supabase Auth means reimplementing these five
 * functions against `supabase.auth`, and nothing else in the app changes.
 *
 * Supabase equivalents, for whoever picks this up:
 *   login()          -> supabase.auth.signInWithPassword({ email, password })
 *   logout()         -> supabase.auth.signOut()
 *   getCurrentUser() -> supabase.auth.getUser() + a profiles row for role/shopId
 *   onAuthChange()   -> supabase.auth.onAuthStateChange()
 */

const SESSION_KEY = 'session';
const SESSION_HOURS = 12;

export interface LoginInput {
  email: string;
  password: string;
}

function makeSession(user: User): Session {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_HOURS * 3600 * 1000);
  return {
    user,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function login({ email, password }: LoginInput): Promise<Session> {
  // A touch of latency so the button's loading state is real.
  await delay(null, 320);

  const db = read();
  const normalized = email.trim().toLowerCase();
  const credential = db.credentials.find((c) => c.email.toLowerCase() === normalized);

  // Deliberately identical message for unknown email and wrong password.
  if (!credential || credential.password !== password) {
    throw new ServiceError('That email and password combination is not recognised.', 'forbidden');
  }

  const user = db.users.find((u) => u.id === credential.userId);
  if (!user) {
    throw new ServiceError('That email and password combination is not recognised.', 'forbidden');
  }
  if (!user.active) {
    throw new ServiceError('This account has been deactivated. Contact the owner.', 'forbidden');
  }

  const loggedIn: User = { ...user, lastLoginAt: new Date().toISOString() };
  write((current) => {
    current.users = current.users.map((u) => (u.id === user.id ? loggedIn : u));
  });

  const session = makeSession(loggedIn);
  writeJSON(SESSION_KEY, session);
  return session;
}

export async function logout(): Promise<void> {
  removeKey(SESSION_KEY);
  await delay(null, 120);
}

/** The stored session, or null when there is none or it has expired. */
export function getCurrentUser(): User | null {
  const session = readJSON<Session | null>(SESSION_KEY, null);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    removeKey(SESSION_KEY);
    return null;
  }

  // Re-read from the database so a role or shop change takes effect on reload.
  const fresh = read().users.find((u) => u.id === session.user.id);
  if (!fresh || !fresh.active) {
    removeKey(SESSION_KEY);
    return null;
  }
  return fresh;
}

export function getSession(): Session | null {
  const user = getCurrentUser();
  return user ? readJSON<Session | null>(SESSION_KEY, null) : null;
}

/** Placeholder — password changes need a real backend to mean anything. */
export async function changePassword(): Promise<never> {
  await delay(null, 200);
  throw new ServiceError(
    'Password changes need the backend connected. This is a demo placeholder.',
    'forbidden',
  );
}

/** Placeholder for the admin's "reset this shop's password" action. */
export async function sendPasswordReset(email: string): Promise<string> {
  await delay(null, 320);
  return `A reset link would be emailed to ${email} once the backend is connected.`;
}
