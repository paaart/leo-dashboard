import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RequestAccessBody = {
  fullName?: unknown;
  username?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
};

const usernamePattern = /^[a-z0-9_-]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUsername(value: unknown) {
  return getString(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  return getString(value).toLowerCase();
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(req: Request) {
  let body: RequestAccessBody;

  try {
    body = (await req.json()) as RequestAccessBody;
  } catch {
    return jsonError("Invalid request body");
  }

  const fullName = getString(body.fullName);
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const phone = getString(body.phone);
  const password = getString(body.password);

  if (!fullName) return jsonError("Full name is required");
  if (!username) return jsonError("Username is required");
  if (username.length < 3) {
    return jsonError("Username must be at least 3 characters");
  }
  if (!usernamePattern.test(username)) {
    return jsonError(
      "Username can only contain letters, numbers, underscores, and hyphens"
    );
  }
  if (!email || !emailPattern.test(email)) {
    return jsonError("A valid email is required");
  }
  if (!phone || phoneDigits(phone).length < 10) {
    return jsonError("Phone number must contain at least 10 digits");
  }
  if (!password) return jsonError("Password is required");

  const admin = createAdminClient();

  try {
    const { data: existingUsername, error: usernameError } = await admin
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .limit(10);

    if (usernameError) {
      return jsonError("Could not validate account request", 500);
    }

    if (
      existingUsername?.some(
        (profile) => profile.username.toLowerCase() === username
      )
    ) {
      return jsonError("Username is already taken", 409);
    }

    const { data: existingEmail, error: emailError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (emailError) {
      return jsonError("Could not validate account request", 500);
    }

    if (existingEmail) {
      return jsonError("Email is already registered", 409);
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username,
          phone,
        },
      });

    if (authError || !authData.user) {
      return jsonError("Could not create account request", 500);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      auth_user_id: authData.user.id,
      full_name: fullName,
      username,
      email,
      phone,
      role: "user",
      status: "pending",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return jsonError("Could not create account request", 500);
    }

    return NextResponse.json({
      ok: true,
      message: "Account request submitted. Please wait for admin approval.",
    });
  } catch (error) {
    console.error("REQUEST ACCESS ERROR:", error);
    return jsonError("Could not submit account request", 500);
  }
}
