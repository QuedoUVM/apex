import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeText, validateMonto, parseMonto } from '../constants/validation';

const ref = (uid) => collection(db, 'users', uid, 'inversiones');

export const TIPOS_INVERSION = [
  { label: 'Acciones',     icon: 'bar-chart-outline' },
  { label: 'Cripto',       icon: 'logo-bitcoin' },
  { label: 'Inmobiliaria', icon: 'home-outline' },
  { label: 'Fondos',       icon: 'business-outline' },
  { label: 'Bonos',        icon: 'document-text-outline' },
  { label: 'Otro',         icon: 'briefcase-outline' },
];

export async function getInversiones(uid) {
  const q = query(ref(uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addInversion(uid, { nombre, tipo, montoInvertido, valorActual }) {
  // Validar montoInvertido
  const montoValidation = validateMonto(montoInvertido);
  if (!montoValidation.valid) throw new Error(montoValidation.message);

  // Validar valorActual
  const valorValidation = validateMonto(valorActual);
  if (!valorValidation.valid) throw new Error(valorValidation.message);

  // Sanitizar nombre
  const safeNombre = sanitizeText(nombre, 100);
  if (!safeNombre) throw new Error('El nombre no puede estar vacío.');

  await addDoc(ref(uid), {
    nombre:         safeNombre,
    tipo,
    montoInvertido: parseMonto(montoInvertido),
    valorActual:    parseMonto(valorActual),
    createdAt:      serverTimestamp(),
  });
}

export async function updateValorActual(uid, inversionId, valorActual) {
  const valorValidation = validateMonto(valorActual);
  if (!valorValidation.valid) throw new Error(valorValidation.message);

  await updateDoc(doc(db, 'users', uid, 'inversiones', inversionId), {
    valorActual: parseMonto(valorActual),
  });
}

export async function deleteInversion(uid, inversionId) {
  await deleteDoc(doc(db, 'users', uid, 'inversiones', inversionId));
}
