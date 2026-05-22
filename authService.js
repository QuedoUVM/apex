import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

async function saveUserDoc(user, extra = {}) {
  await setDoc(
    doc(db, 'athena_users', user.uid),
    { email: user.email, displayName: user.displayName ?? null, updatedAt: serverTimestamp(), ...extra },
    { merge: true }
  );
}

export async function registerUser(email, password, profile = {}) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  if (profile.nombre) {
    await updateProfile(user, { displayName: profile.nombre });
  }
  await setDoc(doc(db, 'athena_users', user.uid), {
    email,
    displayName:      profile.nombre         ?? null,
    telefono:         profile.telefono        ?? null,
    rfc:              profile.rfc             ?? null,
    fechaNacimiento:  profile.fechaNacimiento ?? null,
    createdAt: serverTimestamp(),
  });
  return user;
}

export async function updateUserProfile(uid, data) {
  if (data.displayName !== undefined && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.displayName });
  }
  await setDoc(doc(db, 'athena_users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function loginUser(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  const { user } = await signInWithPopup(auth, provider);
  await saveUserDoc(user);
  return user;
}

export async function signInWithGoogleCredential(idToken) {
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);
  await saveUserDoc(user);
  return user;
}

export function logoutUser() {
  return signOut(auth);
}

export async function enableTwoFactor(uid) {
  await setDoc(doc(db, 'athena_users', uid), { twoFactorEnabled: true }, { merge: true });
}

export async function disableTwoFactor(uid) {
  await setDoc(doc(db, 'athena_users', uid), { twoFactorEnabled: false }, { merge: true });
}

export async function getTwoFactorEnabled(uid) {
  const snap = await getDoc(doc(db, 'athena_users', uid));
  return snap.data()?.twoFactorEnabled ?? false;
}
