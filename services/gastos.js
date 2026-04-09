import { collection, doc, addDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeText, validateMonto, validateTransactionDate, parseMonto } from '../constants/validation';

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

export async function deleteGasto(uid, gastoId) {
  await deleteDoc(doc(db, 'users', uid, 'gastos', gastoId));
}
