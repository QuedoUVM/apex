import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBeMgxm8RWVSYwf2Qz_AKTKHJqKB6D8ERI",
  authDomain: "athena-f695a.firebaseapp.com",
  projectId: "athena-f695a",
  storageBucket: "athena-f695a.firebasestorage.app",
  messagingSenderId: "788449188960",
  appId: "1:788449188960:web:7a985f3e5b6e87db363705",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : getReactNativePersistence(AsyncStorage),
  popupRedirectResolver: Platform.OS === 'web'
    ? browserPopupRedirectResolver
    : undefined,
});

export const db = getFirestore(app, 'athena-users');
