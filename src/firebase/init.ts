'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;

    // Detectamos si estamos en GitHub Actions (CI)
    // Si estamos en CI, SALTAMOS el intento automático para evitar el error
    const isCI = process.env.CI === 'true';

    if (!isCI) {
      try {
        // Solo intentamos la inicialización automática si NO estamos en GitHub
        firebaseApp = initializeApp();
      } catch (e) {
        // Si falla (ej. en local), continuamos silenciosamente al fallback
      }
    }

    // Si la automática no funcionó o nos la saltamos, usamos tu config manual
    // Esto es lo que hará que funcione en Plesk
    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const authDomain = firebaseConfig.authDomain || (getApp().options as any).authDomain;
  if (authDomain?.includes("identity.firebaseapp.com")) {
      const tenantId = authDomain.split('.')[0];
      auth.tenantId = tenantId;
  }
  return {
    firebaseApp,
    auth: auth,
    firestore: getFirestore(firebaseApp)
  };
}
