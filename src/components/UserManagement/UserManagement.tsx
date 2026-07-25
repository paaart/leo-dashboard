"use client";

import { useEffect, useMemo, useState } from "react";
import {
  alertDanger,
  alertSuccess,
  buttonSecondary,
  card,
} from "@/components/shared/ui";

type Role = "user" | "admin";
type Status = "pending" | "active" | "inactive" | "rejected";

type ManagedUser = {
  id: string;
  full_name: string | null;
  username: string;
  email: string;
  phone: string | null;
  role: Role;
  status: Status;
  created_at: string;
};

type UsersResponse =
  | { ok: true; data: ManagedUser[] }
  | { ok: false; error?: string };

const statuses: Status[] = ["pending", "active", "inactive", "rejected"];

const statusStyles: Record<Status, string> = {
  pending: "border-warning/25 bg-warning-soft text-warning-soft-fg",
  active: "border-success/25 bg-success-soft text-success-soft-fg",
  inactive: "border-edge bg-surface-2 text-fg-muted",
  rejected: "border-danger/25 bg-danger-soft text-danger-soft-fg",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (statusFilter === "all") return users;
    return users.filter((user) => user.status === statusFilter);
  }, [statusFilter, users]);

  const counts = useMemo(() => {
    return statuses.reduce<Record<Status, number>>(
      (acc, status) => {
        acc[status] = users.filter((user) => user.status === status).length;
        return acc;
      },
      { pending: 0, active: 0, inactive: 0, rejected: 0 }
    );
  }, [users]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as UsersResponse;

      if (!res.ok) {
        throw new Error("error" in json ? json.error : "Could not load users");
      }

      if (!json.ok) {
        throw new Error(json.error || "Could not load users");
      }

      setUsers(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const updateUser = async (
    userId: string,
    updates: Partial<Pick<ManagedUser, "role" | "status">>,
    successMessage: string
  ) => {
    setSavingId(userId);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not update user");
      }

      setMessage(successMessage);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas p-4 text-fg sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Review account requests, approve users, and manage dashboard access.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl border p-4 text-left shadow-card transition ${
                statusFilter === status
                  ? "border-accent bg-accent-soft"
                  : "border-edge bg-surface hover:border-edge-strong"
              }`}
            >
              <div className="text-sm capitalize text-fg-muted">
                {status}
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {counts[status]}
              </div>
            </button>
          ))}
        </div>

        <div className={card}>
          <div className="flex flex-col gap-3 border-b border-edge p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Dashboard Users</h2>
              <p className="text-sm text-fg-muted">
                Showing {filteredUsers.length} user
                {filteredUsers.length === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as Status | "all")
                }
                className="rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className={buttonSecondary}
              >
                Refresh
              </button>
            </div>
          </div>

          {message && (
            <div className={`mx-4 mt-4 ${alertSuccess}`}>
              {message}
            </div>
          )}

          {error && (
            <div className={`mx-4 mt-4 ${alertDanger}`}>
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-edge text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-fg-muted"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-fg-muted"
                    >
                      No users found for this status.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="align-top transition-colors hover:bg-surface-2/60"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {user.full_name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {user.username}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {user.phone || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize">
                        {user.role}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${statusStyles[user.status]}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="min-w-64 px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {user.status === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    { role: "user", status: "active" },
                                    "User approved."
                                  )
                                }
                                className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                              >
                                Approve as User
                              </button>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    { role: "admin", status: "active" },
                                    "Admin approved."
                                  )
                                }
                                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-60"
                              >
                                Approve as Admin
                              </button>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    { status: "rejected" },
                                    "Request rejected."
                                  )
                                }
                                className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger-soft-fg hover:bg-danger-soft disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {user.status === "active" && (
                            <>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    {
                                      role:
                                        user.role === "admin" ? "user" : "admin",
                                    },
                                    "Role updated."
                                  )
                                }
                                className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-60"
                              >
                                Change Role
                              </button>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    { status: "inactive" },
                                    "User deactivated."
                                  )
                                }
                                className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger-soft-fg hover:bg-danger-soft disabled:opacity-60"
                              >
                                Deactivate
                              </button>
                            </>
                          )}

                          {(user.status === "inactive" ||
                            user.status === "rejected") && (
                            <>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    { status: "active" },
                                    "User reactivated."
                                  )
                                }
                                className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                              >
                                Reactivate
                              </button>
                              <button
                                type="button"
                                disabled={savingId === user.id}
                                onClick={() =>
                                  void updateUser(
                                    user.id,
                                    {
                                      role:
                                        user.role === "admin" ? "user" : "admin",
                                    },
                                    "Role updated."
                                  )
                                }
                                className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-60"
                              >
                                Set Role
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
