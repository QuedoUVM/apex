import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const ref = (uid) => collection(db, 'users', uid, 'notificaciones');

export async function getNotificaciones(uid) {
  const q = query(ref(uid), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function marcarLeida(uid, notifId) {
  await updateDoc(doc(db, 'users', uid, 'notificaciones', notifId), {
    leida: true,
  });
}

export async function marcarTodasLeidas(uid) {
  const snap = await getDocs(ref(uid));
  const pendientes = snap.docs.filter((d) => !d.data().leida);
  await Promise.all(pendientes.map((d) => updateDoc(d.ref, { leida: true })));
}

// Uso interno: crear notificaciones desde la app (ej. tras agregar gasto grande)
export async function crearNotificacion(uid, { titulo, mensaje, tipo = 'info' }) {
  await addDoc(ref(uid), {
    titulo,
    mensaje,
    tipo, // 'info' | 'alerta' | 'exito'
    leida: false,
    fecha: serverTimestamp(),
  });
}
