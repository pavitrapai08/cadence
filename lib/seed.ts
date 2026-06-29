/**
 * Idempotent seed — safe to re-run. Uses the SERVICE ROLE key (bypasses RLS).
 * Run with:  npm run db:seed   (loads .env.local via Node --env-file)
 *
 * Seeds 5 clients, 7 tag groups, all tags (with is_billable/is_required),
 * and 13 projects with colours, external IDs, and tag-group assignment.
 */
import { createClient } from "@supabase/supabase-js";
import { CLIENTS, TAG_GROUPS, PROJECTS } from "./seed-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.local.example → .env.local and fill them in.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function upsertReturningIds(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<Map<string, string>> {
  const { data, error } = await db
    .from(table)
    .upsert(rows, { onConflict })
    .select("id, name");
  if (error) throw new Error(`${table}: ${error.message}`);
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.name as string, row.id as string);
  return map;
}

async function main() {
  console.log("Seeding Cadence workspace…");

  // 1. Clients
  const clientIds = await upsertReturningIds(
    "clients",
    CLIENTS.map((name) => ({ name })),
    "name",
  );
  console.log(`  clients:    ${clientIds.size}`);

  // 2. Tag groups
  const groupIds = await upsertReturningIds(
    "tag_groups",
    TAG_GROUPS.map((g) => ({ name: g.name })),
    "name",
  );
  console.log(`  tag_groups: ${groupIds.size}`);

  // 3. Tags (per group, with sort_order)
  let tagCount = 0;
  for (const group of TAG_GROUPS) {
    const groupId = groupIds.get(group.name)!;
    const rows = group.tags.map((t, i) => ({
      tag_group_id: groupId,
      name: t.name,
      is_billable: t.is_billable,
      is_required: t.is_required ?? false,
      sort_order: i,
    }));
    const { error } = await db
      .from("tags")
      .upsert(rows, { onConflict: "tag_group_id,name" });
    if (error) throw new Error(`tags (${group.name}): ${error.message}`);
    tagCount += rows.length;
  }
  console.log(`  tags:       ${tagCount}`);

  // 4. Projects
  const projectRows = PROJECTS.map((p) => ({
    name: p.name,
    client_id: clientIds.get(p.client)!,
    tag_group_id: groupIds.get(p.tag_group)!,
    colour: p.colour,
    external_id: p.external_id,
  }));
  const { error: projErr } = await db
    .from("projects")
    .upsert(projectRows, { onConflict: "name" });
  if (projErr) throw new Error(`projects: ${projErr.message}`);
  console.log(`  projects:   ${projectRows.length}`);

  console.log("Seed complete ✓");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
