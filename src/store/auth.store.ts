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

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface PersistedAuthStorage {
  state?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    user?: AuthUser | null;
  };
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  setSession: (session: AuthSession) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const readLegacySession = () => {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  const accessToken = window.localStorage.getItem(LEGACY_STORAGE_KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(
    LEGACY_STORAGE_KEYS.refreshToken,
  );
  const rawUser = window.localStorage.getItem(LEGACY_STORAGE_KEYS.user);

  if (!accessToken || !refreshToken || !rawUser) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  try {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(rawUser) as AuthUser,
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }
};

const readPersistedSession = () => {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  const rawPersisted = window.localStorage.getItem("soligant-auth");
  if (!rawPersisted) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  try {
    const parsed = JSON.parse(rawPersisted) as PersistedAuthStorage;
    return {
      accessToken: parsed.state?.accessToken ?? null,
      refreshToken: parsed.state?.refreshToken ?? null,
      user: parsed.state?.user ?? null,
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }
};

const syncLegacyStorage = (session: AuthSession) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    LEGACY_STORAGE_KEYS.accessToken,
    session.accessToken,
  );
  window.localStorage.setItem(
    LEGACY_STORAGE_KEYS.refreshToken,
    session.refreshToken,
  );
  window.localStorage.setItem(LEGACY_STORAGE_KEYS.user, JSON.stringify(session.user));
};

const clearLegacyStorage = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.refreshToken);
  window.localStorage.removeItem(LEGACY_STORAGE_KEYS.user);
};

const legacySession = readLegacySession();
const persistedSession = readPersistedSession();
const initialSession =
  legacySession.accessToken && legacySession.refreshToken && legacySession.user
    ? legacySession
    : persistedSession;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: initialSession.accessToken,
      refreshToken: initialSession.refreshToken,
      user: initialSession.user,
      isHydrated: true,
      setSession: (session) => {
        syncLegacyStorage(session);
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        });
      },
      setUser: (user) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LEGACY_STORAGE_KEYS.user, JSON.stringify(user));
        }
        set({ user });
      },
      clearSession: () => {
        clearLegacyStorage();
        set({ accessToken: null, refreshToken: null, user: null });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: "soligant-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.accessToken && state.refreshToken && state.user) {
          syncLegacyStorage({
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
            user: state.user,
          });
        } else {
          clearLegacyStorage();
        }

        state.setHydrated(true);
      },
    },
  ),
);
