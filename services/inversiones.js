import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
  await addDoc(ref(uid), {
    nombre:        nombre.trim(),
    tipo,
    montoInvertido: parseFloat(montoInvertido),
    valorActual:    parseFloat(valorActual),
    createdAt:     serverTimestamp(),
  });
}

export async function updateValorActual(uid, inversionId, valorActual) {
  await updateDoc(doc(db, 'users', uid, 'inversiones', inversionId), {
    valorActual: parseFloat(valorActual),
  });
}

export async function deleteInversion(uid, inversionId) {
  await deleteDoc(doc(db, 'users', uid, 'inversiones', inversionId));
}
