import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

/**
 * Hook que escucha el estado de autenticación de Firebase.
 *
 * user === undefined → Firebase aún está resolviendo (cargando)
 * user === null      → No hay sesión activa
 * user === objeto    → Sesión activa
 */
export function useAuth() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return unsubscribe;
  }, []);

  return {
    user,
    loading: user === undefined,
    isAuthenticated: !!user,
  };
}
