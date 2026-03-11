"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMeResponse =
  | { ok: true; user: { id: string; email?: string | null } }
  | { ok: false; error?: string };

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      setAuthLoading(true);

      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const json: AuthMeResponse = await res.json();

        if (cancelled) return;

        if (res.ok && json.ok) {
          setIsLoggedIn(true);
          setLabel(json.user.email ?? null);
        } else {
          setIsLoggedIn(false);
          setLabel(null);
        }
      } catch {
        if (cancelled) return;
        setIsLoggedIn(false);
        setLabel(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      setIsLoggedIn(false);
      setLabel(null);
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between bg-white px-6 py-4 shadow dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Image
          src="https://leopackersandmovers.com/intercity/images/header-logo.png"
          alt="Leo Packers"
          width={150}
          height={40}
          priority
          className="h-15 w-auto object-contain"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {authLoading ? (
          <span className="text-xs">Checking login…</span>
        ) : isLoggedIn ? (
          <>
            <span>{label ? `Welcome, ${label}` : "Welcome"}</span>
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
