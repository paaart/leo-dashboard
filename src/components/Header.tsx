// src/components/Header.tsx
import Image from "next/image";
import { Menu } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Menu className="h-6 w-6 block md:hidden" />
        <Image
          src="https://leopackersandmovers.com/intercity/images/header-logo.png"
          alt="Leo Packers"
          width={150}
          height={40}
          className="h-15 w-auto object-contain"
        />
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Welcome, Admin
      </div>
    </header>
  );
}
