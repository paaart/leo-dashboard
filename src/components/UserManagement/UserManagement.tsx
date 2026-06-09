"use client";

import { useEffect, useMemo, useState } from "react";

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
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  inactive:
    "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
  rejected:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
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
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review account requests, approve users, and manage dashboard access.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border p-4 text-left transition ${
                statusFilter === status
                  ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
              }`}
            >
              <div className="text-sm capitalize text-gray-500 dark:text-gray-400">
                {status}
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {counts[status]}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Dashboard Users</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredUsers.length} user
                {filteredUsers.length === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as Status | "all")
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
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
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Refresh
              </button>
            </div>
          </div>

          {message && (
            <div className="mx-4 mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950 dark:text-gray-400">
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
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      No users found for this status.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="align-top hover:bg-gray-50 dark:hover:bg-gray-950/70"
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
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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
                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
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
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
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
                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
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
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
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
