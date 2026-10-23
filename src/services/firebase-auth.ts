/**
 * Firebase Authentication Service for PontoPro
 * Handles sign-in, sign-up, sign-out, and session management.
 */

import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  companyId?: string;
}

let authStateListener: ((user: AuthUser | null) => void) | null = null;

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  return mapFirebaseUser(user);
}

/**
 * Register a new user with email and password.
 */
export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  if (displayName) {
    await updateProfile(user, { displayName });
  }

  return mapFirebaseUser(user);
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Get the currently signed-in user, if any.
 */
export function getCurrentUser(): AuthUser | null {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return mapFirebaseUser(firebaseUser);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback(mapFirebaseUser(firebaseUser));
    } else {
      callback(null);
    }
  });

  return () => {
    unsubscribe();
    authStateListener = null;
  };
}

/**
 * Get the Firebase Auth instance.
 */
export function getAuthInstance(): Auth {
  return auth;
}

function mapFirebaseUser(user: User): AuthUser {
  const customClaims = (user as unknown as { customClaims?: Record<string, any> }).customClaims;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: customClaims?.role || 'employee',
    companyId: customClaims?.companyId,
  };
}
