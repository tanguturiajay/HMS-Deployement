import { create } from 'zustand';
import { logoutPatient } from '../services/authService';
import {
  clearTokens,
  getRefreshToken,
  setTokens,
} from '../services/tokenStore';

interface AuthState {
  isLoggedIn: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  // Flip state only; used when the session already died server-side (refresh failed)
  setLoggedOut: () => void;
  checkLoginStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  login: async (accessToken: string, refreshToken: string) => {
    await setTokens(accessToken, refreshToken);
    set({ isLoggedIn: true });
  },
  logout: async () => {
    // Best-effort server revoke of the refresh token, then clear locally
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        await logoutPatient(refreshToken);
      } catch {
        // Network/already-revoked: clear locally regardless
      }
    }
    await clearTokens();
    set({ isLoggedIn: false });
  },
  setLoggedOut: () => set({ isLoggedIn: false }),
  checkLoginStatus: async () => {
    // A stored refresh token means the session can still be renewed
    const refreshToken = await getRefreshToken();
    set({ isLoggedIn: Boolean(refreshToken) });
  },
}));
