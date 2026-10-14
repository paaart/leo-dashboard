// Real PostgreSQL semantics in an isolated, in-memory PGlite database.
// Load the actual TypeScript modules with only their infrastructure dependencies replaced.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
function loadTS(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => {
      if (name in dependencies) return dependencies[name];
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}
const validation = loadTS("src/lib/inventory/count-validation.ts");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const admin = id(1),
  staff = id(2),
  regular = id(3),
  branch = id(10),
  otherBranch = id(11),
  m1 = id(20),
  m2 = id(21);
let pg, counts, api, history, access;
const entry = (materialId, quantity, version = null) => ({
  materialId,
  quantity,
  version,
});
before(async () => {
  pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated;
    create table profiles (id uuid primary key, role text, status text, full_name text, username text);
    create table inventory_branches (id uuid primary key, is_active boolean);
    create table inventory_materials (id uuid primary key, is_active boolean);
    create table inventory_branch_assignments (profile_id uuid, branch_id uuid);
    alter table inventory_branches enable row level security;
    alter table inventory_materials enable row level security;
    alter table inventory_branch_assignments enable row level security;
    grant all on inventory_branches, inventory_materials, inventory_branch_assignments to anon, authenticated;
    insert into profiles values ('${admin}', 'admin', 'active', 'Admin', 'admin'), ('${staff}', 'branch', 'active', 'Staff', 'staff'), ('${regular}', 'user', 'active', 'User', 'user');
    insert into inventory_branches values ('${branch}', true), ('${otherBranch}', true);
    insert into inventory_materials values ('${m1}', true), ('${m2}', true);
    insert into inventory_branch_assignments values ('${staff}', '${branch}');`);
  await pg.exec(
    fs.readFileSync(
      "supabase/migrations/20261013154626_inventory_counts.sql",
      "utf8",
    ),
  );
  const query = async (sql, params) => {
    const result = await pg.query(sql, params);
    return {
      rows: result.rows,
      rowCount: result.affectedRows || result.rows.length,
    };
  };
  counts = loadTS("src/lib/inventory/counts.ts", {
    "@/lib/db": {
      db: { query, connect: async () => ({ query, release() {} }) },
    },
  });
  access = loadTS("src/lib/inventory/access.ts", {
    "@/lib/auth": { requireAuth: async (req) => req.auth },
    "./setup": {
      getAssignedBranchIds: async (profileId) =>
        (
          await query(
            "select branch_id from inventory_branch_assignments where profile_id = $1",
            [profileId],
          )
        ).rows.map((r) => r.branch_id),
    },
  });
  const dependencies = {
    "@/lib/inventory/access": access,
    "@/lib/inventory/http": loadTS("src/lib/inventory/http.ts"),
    "@/lib/inventory/setup": {
      listBranches: async () => [{ id: branch }, { id: otherBranch }],
      listMaterials: async () => [{ id: m1 }, { id: m2 }],
    },
    "@/lib/inventory/counts": counts,
    "@/lib/inventory/count-validation": validation,
  };
  api = loadTS("src/app/api/inventory/counts/route.ts", dependencies);
  history = loadTS(
    "src/app/api/inventory/counts/history/route.ts",
    dependencies,
  );
});
after(async () => {
  await pg?.close();
});

test("date and quantity validation rejects impossible dates, duplicates, fractions, negatives and missing versions", () => {
  assert.equal(validation.validCountDate("2026-08-31", "2026-10-13"), true);
  for (const date of ["2026-08-30", "2026-09-31", "2026-10-14", "no"])
    assert.equal(validation.validCountDate(date, "2026-10-13"), false);
  assert.equal(
    validation.inventoryToday(new Date("2026-10-12T20:00:00Z")),
    "2026-10-13",
  );
  assert.equal(validation.validCountEntries([entry(m1, 0)]), true);
  for (const entries of [
    [],
    [entry(m1, -1)],
    [entry(m1, 1.5)],
    [entry(m1, 2147483648)],
    [entry(m1, "4")],
    [entry(m1, 1), entry(m1, 2)],
    [{ materialId: m1, quantity: 1 }],
  ])
    assert.equal(validation.validCountEntries(entries), false);
});

test("partial saves, explicit zero, corrections, history and historical dates", async () => {
  await counts.saveCounts(
    branch,
    "2026-09-30",
    [entry(m1, 10), entry(m2, 8)],
    admin,
  );
  await counts.saveCounts(branch, "2026-09-30", [entry(m1, 0, 1)], staff);
  let rows = await counts.listCounts([branch]);
  assert.equal(rows.find((r) => r.materialId === m1).quantity, 0);
  assert.equal(rows.find((r) => r.materialId === m2).quantity, 8);
  await counts.saveCounts(branch, "2026-08-31", [entry(m1, 30)], admin);
  rows = await counts.listCounts([branch]);
  assert.equal(rows.find((r) => r.materialId === m1).countDate, "2026-09-30");
  const edits = await counts.countHistory([branch], m1, 0);
  assert.ok(
    edits.some(
      (e) =>
        e.oldQuantity === 10 && e.newQuantity === 0 && e.editedBy === "Staff",
    ),
  );
  assert.ok(edits.some((e) => e.oldQuantity === null && e.newQuantity === 30));
  const total = edits.length;
  await counts.saveCounts(branch, "2026-09-30", [entry(m1, 0, 2)], admin);
  assert.equal((await counts.countHistory([branch], m1, 0)).length, total);
});

test("stale and duplicate first submissions fail atomically without partial counts or audit rows", async () => {
  const before = await counts.countHistory([branch], m2, 0);
  await assert.rejects(
    counts.saveCounts(
      branch,
      "2026-09-30",
      [entry(m2, 99, 1), entry(m1, 6, 1)],
      admin,
    ),
    /Someone updated/,
  );
  assert.equal(
    (await counts.listCounts([branch])).find((r) => r.materialId === m2)
      .quantity,
    8,
  );
  assert.equal(
    (await counts.countHistory([branch], m2, 0)).length,
    before.length,
  );
  await assert.rejects(
    counts.saveCounts(branch, "2026-09-30", [entry(m1, 6)], admin),
    /Someone updated/,
  );
});

test("database boundary denies unassigned staff, regular users and inactive materials", async () => {
  await assert.rejects(
    counts.saveCounts(otherBranch, "2026-09-30", [entry(m1, 5)], staff),
    /Branch access/,
  );
  await assert.rejects(
    counts.saveCounts(branch, "2026-09-30", [entry(m1, 5, 2)], regular),
    /Branch access/,
  );
  await pg.query(
    "update inventory_materials set is_active = false where id = $1",
    [m2],
  );
  await assert.rejects(
    counts.saveCounts(
      branch,
      "2026-10-01",
      [entry(m1, 5), entry(m2, 5)],
      admin,
    ),
    /inactive/,
  );
  assert.equal((await counts.listCounts([branch], "2026-10-01")).length, 0);
  await pg.query(
    "update inventory_materials set is_active = true where id = $1",
    [m2],
  );
});

function req(role, body, query = "") {
  return {
    auth: {
      ok: true,
      user: {
        id: role === "admin" ? admin : role === "branch" ? staff : regular,
        role,
      },
    },
    nextUrl: new URL(`https://example.test/api/inventory/counts${query}`),
    json: async () => body,
  };
}
test("routes enforce authentication, branch scoping, validation and conflict status", async () => {
  assert.equal((await api.GET(req("user"))).status, 403);
  assert.equal(
    (
      await api.GET({
        auth: { ok: false, response: new Response(null, { status: 401 }) },
      })
    ).status,
    401,
  );
  const result = await (await api.GET(req("branch"))).json();
  assert.deepEqual(
    result.data.branches.map((b) => b.id),
    [branch],
  );
  assert.equal(result.data.isCompanyView, false);
  assert.equal(
    (
      await api.POST(
        req("branch", {
          branchId: otherBranch,
          date: "2026-09-30",
          entries: [entry(m1, 4)],
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api.POST(
        req("admin", {
          branchId: branch,
          date: "2026-09-30",
          entries: [entry(m1, -1)],
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api.POST(
        req("admin", {
          branchId: branch,
          date: "2026-09-30",
          entries: [entry(m1, 1, 1)],
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await history.GET(
        req("branch", null, `?materialId=${m1}&branchId=${otherBranch}`),
      )
    ).status,
    403,
  );
  const own = await (
    await history.GET(req("branch", null, `?materialId=${m1}`))
  ).json();
  assert.ok(own.data.every((e) => e.branchId === branch));
  await pg.query(
    "delete from inventory_branch_assignments where profile_id = $1",
    [staff],
  );
  const unassigned = await (await api.GET(req("branch"))).json();
  assert.deepEqual(unassigned.data.branches, []);
  assert.deepEqual(unassigned.data.counts, []);
});

test("all five inventory tables have RLS and no direct Data API privileges", async () => {
  const rows = await pg.query(
    `select relname, relrowsecurity from pg_class where relname in ('inventory_counts', 'inventory_count_edits', 'inventory_branches', 'inventory_materials', 'inventory_branch_assignments')`,
  );
  assert.equal(rows.rows.length, 5);
  assert.ok(rows.rows.every((r) => r.relrowsecurity));
  for (const { relname } of rows.rows) {
    for (const role of ["anon", "authenticated"]) {
      const result = await pg.query(
        `select has_table_privilege($1, $2, 'SELECT,INSERT,UPDATE,DELETE') as allowed`,
        [role, relname],
      );
      assert.equal(result.rows[0].allowed, false);
    }
  }
});
