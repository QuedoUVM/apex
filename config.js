// API URL for the Athena backend.
//
// Non-Docker (direct run):
//   Set EXPO_PUBLIC_API_URL in apex_app/.env, or edit the fallback below.
//
// Docker:
//   Set HOST_IP in the root .env (sibling to docker-compose.yml).
//   docker-compose passes it as EXPO_PUBLIC_API_URL automatically.
//
// Device-specific notes:
//   iOS Simulator  → use "localhost"
//   Android Emulator → use "10.0.2.2"
//   Physical device → use the host machine's LAN IP (e.g. 192.168.1.42)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const FETCH_TIMEOUT_MS = 15000;
