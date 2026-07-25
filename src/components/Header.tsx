"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";

type HeaderUser = {
  email: string;
  username: string;
  fullName: string | null;
  role: "user" | "admin";
};

export default function Header({
  onMenuClick,
  user,
}: {
  onMenuClick: () => void;
  user: HeaderUser;
}) {
  const router = useRouter();
  const displayName = user.username || user.fullName || user.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b border-edge bg-surface/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Image
          src="https://leopackersandmovers.com/intercity/images/header-logo.png"
          alt="Leo Packers"
          width={150}
          height={40}
          priority
          className="h-9 w-auto shrink-0 object-contain"
        />
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-fg">
            {initials}
          </span>
          <div className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="max-w-36 truncate text-sm font-medium text-fg">
              {displayName}
            </span>
            <span className="text-xs capitalize text-fg-subtle">
              {user.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger-soft-fg"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
