// HMS backend base URL; set EXPO_PUBLIC_API_URL in .env to your LAN IP for Expo Go
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api";
