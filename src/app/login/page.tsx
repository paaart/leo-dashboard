"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Login failed");
        return;
      }

      router.push("/dashboard/domestic");
      router.refresh();
    } catch (e) {
      setError(`Login failed. Please try again. ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestField = (
    field: keyof typeof requestForm,
    value: string
  ) => {
    setRequestForm((prev) => ({ ...prev, [field]: value }));
  };

  const requestValidationError = () => {
    const normalizedUsername = requestForm.username.trim().toLowerCase();
    const phoneDigits = requestForm.phone.replace(/\D/g, "");

    if (!requestForm.fullName.trim()) return "Full name is required";
    if (!normalizedUsername) return "Username is required";
    if (normalizedUsername.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (!/^[a-z0-9_-]+$/.test(normalizedUsername)) {
      return "Username can only contain letters, numbers, underscores, and hyphens";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestForm.email.trim())) {
      return "A valid email is required";
    }
    if (phoneDigits.length < 10) {
      return "Phone number must contain at least 10 digits";
    }
    if (!requestForm.password) return "Password is required";
    if (requestForm.password !== requestForm.confirmPassword) {
      return "Confirm password must match password";
    }

    return null;
  };

  const handleRequestAccess = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = requestValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setRequestLoading(true);

    try {
      const res = await fetch("/api/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: requestForm.fullName.trim(),
          username: requestForm.username.trim().toLowerCase(),
          email: requestForm.email.trim().toLowerCase(),
          phone: requestForm.phone.trim(),
          password: requestForm.password,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Could not submit account request");
        return;
      }

      setSuccess(
        json.message ||
          "Account request submitted. Please wait for admin approval."
      );
      setShowRequestForm(false);
      setRequestForm({
        fullName: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } catch (e) {
      setError(`Could not submit account request. ${e}`);
    } finally {
      setRequestLoading(false);
    }
  };

  const disabledRequestSubmit =
    requestLoading || Boolean(requestValidationError());

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold">Leo Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {showRequestForm
            ? "Request dashboard access from an administrator."
            : "Sign in with your dashboard account."}
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </p>
        )}

        {showRequestForm ? (
          <form onSubmit={handleRequestAccess} className="mt-6 space-y-4">
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="text"
              placeholder="Full Name"
              value={requestForm.fullName}
              onChange={(event) =>
                updateRequestField("fullName", event.target.value)
              }
              required
            />
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="text"
              placeholder="Username / Emp Code"
              value={requestForm.username}
              onChange={(event) =>
                updateRequestField("username", event.target.value)
              }
              autoComplete="username"
              required
            />
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="email"
              placeholder="Email"
              value={requestForm.email}
              onChange={(event) =>
                updateRequestField("email", event.target.value)
              }
              autoComplete="email"
              required
            />
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="tel"
              placeholder="Phone Number"
              value={requestForm.phone}
              onChange={(event) =>
                updateRequestField("phone", event.target.value)
              }
              autoComplete="tel"
              required
            />
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="password"
              placeholder="Password"
              value={requestForm.password}
              onChange={(event) =>
                updateRequestField("password", event.target.value)
              }
              autoComplete="new-password"
              required
            />
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="password"
              placeholder="Confirm Password"
              value={requestForm.confirmPassword}
              onChange={(event) =>
                updateRequestField("confirmPassword", event.target.value)
              }
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              disabled={disabledRequestSubmit}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestLoading ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRequestForm(false);
                setError(null);
                setSuccess(null);
              }}
              className="w-full rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <label
              htmlFor="username"
              className="mt-6 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Username / Emp Code
            </label>
            <input
              id="username"
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <input
              className="mt-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRequestForm(true);
                setError(null);
                setSuccess(null);
              }}
              className="mt-3 w-full rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Request Access / Create Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
