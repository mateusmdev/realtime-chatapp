import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const firebaseConfig =  {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
}

const app = initializeApp(firebaseConfig)

initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
})

if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  const envToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  if (envToken && envToken.trim() !== '') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = envToken;
    console.log('[AppCheck] Usando token do .env:', envToken);
  } else {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.warn('[AppCheck] VITE_APPCHECK_DEBUG_TOKEN vazio no .env. Gerando um novo no console...');
  }
}

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
})

export default app