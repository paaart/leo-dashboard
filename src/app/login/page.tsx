"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("email")
      .eq("employee_code", employeeCode.trim())
      .single();

    if (error || !data?.email) {
      alert("Invalid employee code");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });

    if (loginError) {
      alert("Login failed: " + loginError.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="dark:bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl text-black font-semibold mb-6">Login</h2>

        <input
          className="w-full mb-4 p-2 border rounded text-gray-700 bg-white"
          type="text"
          placeholder="Employee Code (e.g. EMP001)"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
        />

        <input
          className="w-full mb-4 p-2 border rounded text-gray-700 bg-white"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
