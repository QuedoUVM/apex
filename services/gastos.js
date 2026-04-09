import { collection, doc, addDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const ref = (uid) => collection(db, 'users', uid, 'gastos');

// icon: nombre de Ionicons
export const CATEGORIAS_GASTO = [
  { label: 'Alimentación',    icon: 'fast-food-outline' },
  { label: 'Transporte',      icon: 'car-outline' },
  { label: 'Salud',           icon: 'medkit-outline' },
  { label: 'Entretenimiento', icon: 'film-outline' },
  { label: 'Servicios',       icon: 'flash-outline' },
  { label: 'Ropa',            icon: 'shirt-outline' },
  { label: 'Educación',       icon: 'book-outline' },
  { label: 'Otro',            icon: 'grid-outline' },
];

export async function getGastos(uid) {
  const q = query(ref(uid), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addGasto(uid, { descripcion, monto, categoria, fecha, icon }) {
  await addDoc(ref(uid), {
    descripcion: descripcion.trim(),
    monto:       parseFloat(monto),
    categoria,
    icon,
    fecha,
    createdAt:   serverTimestamp(),
  });
}

export async function deleteGasto(uid, gastoId) {
  await deleteDoc(doc(db, 'users', uid, 'gastos', gastoId));
}
