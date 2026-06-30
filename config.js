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
// Production backend on Render — works with the developer's PC off.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://athena-api-osjl.onrender.com';

// 60s tolerates a cold start on free cloud tiers (server wakes from idle ~50s).
export const FETCH_TIMEOUT_MS = 60000;
