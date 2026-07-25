"use client";

import { useEffect, useState } from "react";
import { inputField, buttonPrimary, buttonSecondary } from "@/components/shared/ui";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1") {
      setNotice("Your session has expired. Please sign in again.");
    }
  }, []);
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

      router.push("/dashboard/home");
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-fg">
      <div className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-card">
        <h1 className="text-2xl font-semibold tracking-tight">Leo Dashboard</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {showRequestForm
            ? "Request dashboard access from an administrator."
            : "Sign in with your dashboard account."}
        </p>

        {notice && !error && !success && (
          <p className="mt-4 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2 text-sm text-warning-soft-fg">
            {notice}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-success-soft-fg">
            {success}
          </p>
        )}

        {showRequestForm ? (
          <form onSubmit={handleRequestAccess} className="mt-6 space-y-4">
            <input
              className={`${inputField}`}
              type="text"
              placeholder="Full Name"
              value={requestForm.fullName}
              onChange={(event) =>
                updateRequestField("fullName", event.target.value)
              }
              required
            />
            <input
              className={`${inputField}`}
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
              className={`${inputField}`}
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
              className={`${inputField}`}
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
              className={`${inputField}`}
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
              className={`${inputField}`}
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
              className={`${buttonPrimary} w-full`}
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
              className={`${buttonSecondary} w-full`}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <label
              htmlFor="username"
              className="mt-6 block text-sm font-medium text-fg"
            >
              Username / Emp Code
            </label>
            <input
              id="username"
              className={`mt-2 ${inputField}`}
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <input
              className={`mt-4 ${inputField}`}
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
              className={`${buttonPrimary} mt-6 w-full`}
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
              className={`${buttonSecondary} mt-3 w-full`}
            >
              Request Access / Create Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
