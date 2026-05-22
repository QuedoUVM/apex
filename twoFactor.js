import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SECRET_KEY = 'apex_2fa_secret';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32Encode(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}

function b32Decode(s) {
  const clean = s.toUpperCase().replace(/\s|=/g, '');
  const bytes = [];
  let bits = 0, val = 0;
  for (const c of clean) {
    const idx = B32.indexOf(c);
    if (idx < 0) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) { bytes.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(bytes);
}

function counterToBytes(n) {
  const buf = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { buf[i] = n & 0xff; n = Math.floor(n / 256); }
  return buf;
}

async function hotp(secretBytes, counter) {
  const subtle = globalThis.crypto?.subtle;
  const key = await subtle.importKey(
    'raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = new Uint8Array(await subtle.sign('HMAC', key, counterToBytes(counter)));
  const off = sig[19] & 0xf;
  const code =
    ((sig[off] & 0x7f) << 24) | (sig[off + 1] << 16) | (sig[off + 2] << 8) | sig[off + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateSecret() {
  const bytes = await Crypto.getRandomBytesAsync(20);
  return b32Encode(bytes);
}

export function buildOtpUri(secret, email, issuer = 'Apex') {
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  );
}

export async function verifyTOTP(secret, token) {
  const secretBytes = b32Decode(secret);
  const t = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    const code = await hotp(secretBytes, t + delta);
    if (code === String(token).padStart(6, '0')) return true;
  }
  return false;
}

export async function saveSecret(secret) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(SECRET_KEY, secret);
}

export async function getSecret() {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(SECRET_KEY).catch(() => null);
}

export async function clearSecret() {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(SECRET_KEY).catch(() => {});
}
