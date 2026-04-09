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

// ── Sanitización ────────────────────────────────────────────────────

/**
 * Sanitiza un string de texto libre (descripciones, nombres, etc.)
 * Elimina caracteres peligrosos para XSS y limita longitud.
 */
export function sanitizeText(value, maxLength = 200) {
  if (!value || typeof value !== 'string') return '';
  return Array.from(value.trim())
    .slice(0, maxLength)
    .join('')
    .replace(/[<>"']/g, '');
}

// ── Validación de montos ────────────────────────────────────────────

export const MONTO_MIN = 0.01;
export const MONTO_MAX = 9_999_999.99;

/**
 * Valida que un monto sea un número finito dentro del rango permitido
 * con máximo 2 decimales.
 * @returns {{ valid: boolean, message: string }}
 */
export function validateMonto(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: 'El monto es requerido.' };
  }
  const str = String(value).trim();
  const num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, message: 'El monto no es válido.' };
  }
  if (num < MONTO_MIN) {
    return { valid: false, message: 'El monto debe ser mayor a $0.00.' };
  }
  if (num > MONTO_MAX) {
    return { valid: false, message: 'El monto excede el límite permitido.' };
  }
  // Máximo 2 decimales
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    return { valid: false, message: 'Máximo 2 decimales permitidos.' };
  }
  return { valid: true, message: '' };
}

// ── Validación de fechas con lógica ────────────────────────────────

/**
 * Valida una fecha en formato YYYY-MM-DD.
 * Verifica lógica (mes y día válidos), no permite fechas futuras,
 * ni más de 2 años en el pasado.
 * @returns {{ valid: boolean, message: string }}
 */
export function validateTransactionDate(value) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { valid: false, message: 'La fecha es requerida.' };
  }
  const str = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return { valid: false, message: 'Formato requerido: AAAA-MM-DD.' };
  }
  const [yearStr, monthStr, dayStr] = str.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return { valid: false, message: 'Mes inválido.' };
  }
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  if (day < 1 || day > daysInMonth[month - 1]) {
    return { valid: false, message: 'Día inválido para el mes seleccionado.' };
  }

  const date = new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00`);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (date > today) {
    return { valid: false, message: 'No se permiten fechas futuras.' };
  }

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(today.getFullYear() - 2);
  if (date < twoYearsAgo) {
    return { valid: false, message: 'Fecha demasiado antigua (máx. 2 años).' };
  }

  return { valid: true, message: '' };
}

/**
 * Parsea de forma segura un monto desde cualquier tipo.
 * Devuelve null si el valor no es un número válido.
 */
export function parseMonto(value) {
  const num = parseFloat(value);
  return isFinite(num) && !isNaN(num) ? num : null;
}
