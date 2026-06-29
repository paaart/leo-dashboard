"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

export type DashboardAppUser = {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: "user" | "admin";
  status: "active";
};

type AuthMeResponse =
  | { ok: true; user: DashboardAppUser }
  | { ok: false; error?: string };

type DashboardAuthContextValue = {
  user: DashboardAppUser | null;
  loading: boolean;
  ready: boolean;
  refreshUser: () => Promise<void>;
};

const CACHE_KEY = "leo-dashboard-auth-user";

const DashboardAuthContext = createContext<DashboardAuthContextValue | null>(
  null
);

function readCachedUser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DashboardAppUser;
    if (!parsed || parsed.status !== "active") return null;

    return parsed;
  } catch {
    return null;
  }
}

async function readAuthMeResponse(res: Response): Promise<AuthMeResponse> {
  const text = await res.text();
  if (!text) return { ok: false, error: "Session expired" };

  try {
    return JSON.parse(text) as AuthMeResponse;
  } catch {
    return {
      ok: false,
      error: res.status >= 500 ? "Internal server error" : "Session expired",
    };
  }
}

export function DashboardAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<DashboardAppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cachedUser = readCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const json = await readAuthMeResponse(res);

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          window.localStorage.removeItem(CACHE_KEY);
          setUser(null);
          router.replace("/login");
          return;
        }

        setUser(json.user);
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(json.user));
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem(CACHE_KEY);
          setUser(null);
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const json = await readAuthMeResponse(res);

      if (!res.ok || !json.ok) {
        window.localStorage.removeItem(CACHE_KEY);
        setUser(null);
        router.replace("/login");
        return;
      }

      setUser(json.user);
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(json.user));
    } catch {
      window.localStorage.removeItem(CACHE_KEY);
      setUser(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, ready, refreshUser }),
    [loading, ready, refreshUser, user]
  );

  return (
    <DashboardAuthContext.Provider value={value}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardAuth() {
  const context = useContext(DashboardAuthContext);

  if (!context) {
    throw new Error("useDashboardAuth must be used within DashboardAuthProvider");
  }

  return context;
}
