import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { detectIdentifierType, normalizePhone } from '../constants/validation';

// Mensajes de error legibles en español
const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'Este correo ya está registrado.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/weak-password': 'La contraseña es muy débil.',
  'auth/user-not-found': 'Usuario no encontrado.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Credenciales incorrectas.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'auth/network-request-failed': 'Sin conexión a internet.',
};

function getErrorMessage(error) {
  return FIREBASE_ERRORS[error.code] || 'Ocurrió un error. Intenta de nuevo.';
}

/**
 * Registra un usuario en Firebase Auth y guarda su perfil en Firestore.
 * @param {{ nombre, email, password, phone, curp, fechaNacimiento, direccion }} formData
 */
export async function registerUser(formData) {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      formData.email.trim(),
      formData.password
    );

    await updateProfile(credential.user, {
      displayName: formData.nombre.trim(),
    });

    const normalizedPhone = normalizePhone(formData.phone);
    const normalizedEmail = formData.email.trim().toLowerCase();

    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      nombre: formData.nombre.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      curp: formData.curp.trim().toUpperCase(),
      fechaNacimiento: formData.fechaNacimiento.trim(),
      direccion: formData.direccion.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Índice público para login por teléfono (sin datos sensibles)
    await setDoc(doc(db, 'phoneIndex', normalizedPhone), {
      email: normalizedEmail,
    });

    return credential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Inicia sesión con email o número de teléfono + contraseña.
 * Si es teléfono, busca el email asociado en Firestore.
 * @param {string} identifier - email o teléfono
 * @param {string} password
 */
export async function loginWithEmailOrPhone(identifier, password) {
  const type = detectIdentifierType(identifier.trim());

  try {
    if (type === 'email') {
      return await signInWithEmailAndPassword(auth, identifier.trim(), password);
    }

    if (type === 'phone') {
      const normalized = normalizePhone(identifier);
      const phoneDoc = await getDoc(doc(db, 'phoneIndex', normalized));

      if (!phoneDoc.exists()) {
        throw new Error('Número de teléfono no encontrado.');
      }

      const userEmail = phoneDoc.data().email;
      return await signInWithEmailAndPassword(auth, userEmail, password);
    }

    throw new Error('Ingresa un correo electrónico o número de teléfono válido.');
  } catch (error) {
    // Si ya es un error nuestro (sin code), lo re-lanzamos directo
    if (!error.code) throw error;
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Cierra la sesión del usuario actual.
 * La redirección ocurre reactivamente desde el auth guard.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
