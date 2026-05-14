import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const LEGACY_STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
} as const;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
  customRoleName?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (user: AuthUser) => void;
  setSession: (session: { user: AuthUser }) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const purgeLegacyTokenStorage = () => {
  if (typeof window === "undefined") return;
  // Tokens used to live in localStorage but now sit in httpOnly cookies.
  // Remove leftover entries so stale tokens can't be read by injected scripts.
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.refreshToken);
};

const readLegacyUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  const rawUser = window.localStorage.getItem(LEGACY_STORAGE_KEYS.user);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    return null;
  }
};

const syncLegacyUser = (user: AuthUser | null) => {
  if (typeof window === "undefined") return;

  if (user) {
    window.localStorage.setItem(LEGACY_STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(LEGACY_STORAGE_KEYS.user);
  }
};

purgeLegacyTokenStorage();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: readLegacyUser(),
      isHydrated: true,
      setSession: (session) => {
        syncLegacyUser(session.user);
        set({ user: session.user });
      },
      setUser: (user) => {
        syncLegacyUser(user);
        set({ user });
      },
      clearSession: () => {
        syncLegacyUser(null);
        purgeLegacyTokenStorage();
        set({ user: null });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: "soligant-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        purgeLegacyTokenStorage();
        syncLegacyUser(state.user);
        state.setHydrated(true);
      },
    },
  ),
);
