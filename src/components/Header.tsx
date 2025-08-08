// src/components/Header.tsx
"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<unknown>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        const { data, error } = await supabase
          .from("employees")
          .select("employee_code, is_admin")
          .eq("email", user.email)
          .single();

        if (!error && data) {
          setEmployeeCode(data.employee_code);
          setIsAdmin(data.is_admin);
        }
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Menu className="h-6 w-6 block md:hidden" />
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
        {user ? (
          <>
            <span>
              {isAdmin ? "Welcome, Admin" : `Welcome, ${employeeCode}`}
            </span>
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
