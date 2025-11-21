
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { ADMIN_EMAIL, APP_ID } from '@/lib/config';
import type { VesotelUser, UserProfile, UserSettings, AccessRequest, AllowedUser } from '@/lib/types';

interface AuthContextType {
  user: VesotelUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function checkUserAuthorization(email: string): Promise<boolean> {
  if (email === ADMIN_EMAIL) return true;
  const q = query(collection(db, `artifacts/${APP_ID}/public/data/allowed_users`), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

async function getOrCreateUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile | null> {
    const userRef = doc(db, `artifacts/${APP_ID}/public/data/users`, firebaseUser.uid);
    let userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const reqQuery = query(collection(db, `artifacts/${APP_ID}/public/data/access_requests`), where("email", "==", firebaseUser.email), where("status", "==", "approved"));
        const reqSnap = await getDocs(reqQuery);

        if (!reqSnap.empty) {
            const reqData = reqSnap.docs[0].data() as AccessRequest;
            const newUserProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                firstName: reqData.firstName,
                lastName: reqData.lastName,
                lastLogin: serverTimestamp(),
                type: 'user_registry',
            };
            await setDoc(userRef, newUserProfile);
            // Re-fetch to get server timestamp
            userSnap = await getDoc(userRef);
            return userSnap.data() as UserProfile;
        } else {
             // Edge case: admin or pre-seeded user logging in for the first time
            if (firebaseUser.email === ADMIN_EMAIL || await checkUserAuthorization(firebaseUser.email!)) {
                const nameParts = firebaseUser.displayName?.split(' ') || ['Usuario', 'Nuevo'];
                const newUserProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    firstName: nameParts[0],
                    lastName: nameParts.slice(1).join(' ') || '',
                    lastLogin: serverTimestamp(),
                    type: 'user_registry',
                };
                await setDoc(userRef, newUserProfile);
                userSnap = await getDoc(userRef);
                return userSnap.data() as UserProfile;
            }
            return null; // Not approved
        }
    } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        return userSnap.data() as UserProfile;
    }
}


async function getUserSettings(uid: string): Promise<UserSettings | null> {
    const settingsRef = doc(db, `artifacts/${APP_ID}/users/${uid}/settings/config`);
    const settingsSnap = await getDoc(settingsRef);
    return settingsSnap.exists() ? settingsSnap.data() as UserSettings : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VesotelUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        const isAllowed = await checkUserAuthorization(firebaseUser.email!);
        if (isAllowed) {
            const userProfile = await getOrCreateUserProfile(firebaseUser);
            if(userProfile) {
                const userSettings = await getUserSettings(firebaseUser.uid);
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    isAdmin: firebaseUser.email === ADMIN_EMAIL,
                    isAllowed: true,
                    profile: userProfile,
                    settings: userSettings,
                });
            } else {
                // This case happens if they were removed from allowed list but still have a session
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    isAdmin: false,
                    isAllowed: false,
                    profile: null,
                    settings: null,
                });
            }
        } else {
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                isAdmin: false,
                isAllowed: false,
                profile: null,
                settings: null,
            });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = { user, loading, signInWithGoogle, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
