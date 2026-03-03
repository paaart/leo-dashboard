"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMeResponse =
  | { ok: true; user: { id: string; name: string; email?: string | null } }
  | { ok: false; error?: string };

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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
          setEmail(json.user.name ?? null);
        } else {
          setIsLoggedIn(false);
          setEmail(null);
        }
      } catch {
        if (cancelled) return;
        setIsLoggedIn(false);
        setEmail(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden inline-flex items-center justify-center rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
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
            <span>{email ? `Welcome, ${email}` : "Welcome"}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
