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
        <div className="flex flex-col items-start leading-tight">
          <span className="font-medium">Welcome, {displayName}</span>

          <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
            {user.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
