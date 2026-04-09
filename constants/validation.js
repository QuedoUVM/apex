// CURP: 18 caracteres, formato RENAPO
// Ejemplo válido: LOOA531113HTCPBN07
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

// Teléfono mexicano: 10 dígitos, opcionalmente con +52 al inicio
export const PHONE_REGEX = /^(\+52)?\d{10}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mínimo 8 chars, al menos 1 mayúscula, 1 minúscula, 1 dígito
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Fecha DD/MM/AAAA
export const DATE_REGEX = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

// ------- Funciones validadoras -------
// Retornan { valid: boolean, message: string }

export function validateEmail(value) {
  if (!value || !value.trim()) return { valid: false, message: 'El correo es requerido.' };
  if (!EMAIL_REGEX.test(value.trim())) return { valid: false, message: 'Ingresa un correo válido.' };
  return { valid: true, message: '' };
}

export function validatePhone(value) {
  if (!value || !value.trim()) return { valid: false, message: 'El teléfono es requerido.' };
  const normalized = value.trim().replace(/\s/g, '');
  if (!PHONE_REGEX.test(normalized)) return { valid: false, message: 'Ingresa un número de 10 dígitos.' };
  return { valid: true, message: '' };
}

export function validateCURP(value) {
  if (!value || !value.trim()) return { valid: false, message: 'La CURP es requerida.' };
  if (!CURP_REGEX.test(value.trim().toUpperCase())) {
    return { valid: false, message: 'CURP inválida. Ej: LOOA531113HTCPBN07' };
  }
  return { valid: true, message: '' };
}

export function validatePassword(value) {
  if (!value) return { valid: false, message: 'La contraseña es requerida.' };
  if (!PASSWORD_REGEX.test(value)) {
    return {
      valid: false,
      message: 'Mínimo 8 caracteres, una mayúscula, una minúscula y un número.',
    };
  }
  return { valid: true, message: '' };
}

export function validatePasswordMatch(password, confirm) {
  if (!confirm) return { valid: false, message: 'Confirma tu contraseña.' };
  if (password !== confirm) return { valid: false, message: 'Las contraseñas no coinciden.' };
  return { valid: true, message: '' };
}

export function validateRequired(value, fieldName = 'Este campo') {
  if (!value || !value.trim()) return { valid: false, message: `${fieldName} es requerido.` };
  return { valid: true, message: '' };
}

export function validateDate(value) {
  if (!value || !value.trim()) return { valid: false, message: 'La fecha de nacimiento es requerida.' };
  if (!DATE_REGEX.test(value.trim())) return { valid: false, message: 'Formato válido: DD/MM/AAAA' };
  return { valid: true, message: '' };
}

// Detecta si el identificador es email o teléfono
export function detectIdentifierType(value) {
  if (!value) return 'unknown';
  const trimmed = value.trim();
  if (EMAIL_REGEX.test(trimmed)) return 'email';
  const normalized = trimmed.replace(/\s/g, '');
  if (PHONE_REGEX.test(normalized)) return 'phone';
  return 'unknown';
}

// Normaliza teléfono: quita espacios y prefijo +52
export function normalizePhone(value) {
  return value.trim().replace(/\s/g, '').replace(/^\+52/, '');
}
