import { collection, doc, addDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeText, validateMonto, validateTransactionDate, parseMonto } from '../constants/validation';

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
  // Validar monto
  const montoValidation = validateMonto(monto);
  if (!montoValidation.valid) throw new Error(montoValidation.message);

  // Validar fecha
  const fechaValidation = validateTransactionDate(fecha);
  if (!fechaValidation.valid) throw new Error(fechaValidation.message);

  // Sanitizar descripción
  const safeDescripcion = sanitizeText(descripcion, 200);
  if (!safeDescripcion) throw new Error('La descripción no puede estar vacía.');

  const safeCategoria = sanitizeText(categoria, 50);
  const safeMonto = parseMonto(monto);

  await addDoc(ref(uid), {
    descripcion: safeDescripcion,
    monto:       safeMonto,
    categoria:   safeCategoria,
    icon,
    fecha,
    createdAt:   serverTimestamp(),
  });
}

export async function deleteIngreso(uid, ingresoId) {
  await deleteDoc(doc(db, 'users', uid, 'ingresos', ingresoId));
}
