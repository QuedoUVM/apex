import { collection, doc, addDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const ref = (uid) => collection(db, 'users', uid, 'ingresos');

export const CATEGORIAS_INGRESO = [
  { label: 'Salario',   icon: 'briefcase-outline' },
  { label: 'Freelance', icon: 'laptop-outline' },
  { label: 'Negocio',   icon: 'storefront-outline' },
  { label: 'Inversión', icon: 'trending-up-outline' },
  { label: 'Regalo',    icon: 'gift-outline' },
  { label: 'Otro',      icon: 'cash-outline' },
];

export async function getIngresos(uid) {
  const q = query(ref(uid), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addIngreso(uid, { descripcion, monto, categoria, fecha, icon }) {
  await addDoc(ref(uid), {
    descripcion: descripcion.trim(),
    monto:       parseFloat(monto),
    categoria,
    icon,
    fecha,
    createdAt:   serverTimestamp(),
  });
}

export async function deleteIngreso(uid, ingresoId) {
  await deleteDoc(doc(db, 'users', uid, 'ingresos', ingresoId));
}
