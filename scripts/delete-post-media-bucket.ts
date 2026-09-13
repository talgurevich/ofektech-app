#!/usr/bin/env tsx
// Empties and deletes the `post-media` storage bucket left over from the
// community feed. Supabase forbids deleting storage rows via SQL, so this
// goes through the Storage API with the service role key.
//
//   npx tsx scripts/delete-post-media-bucket.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const BUCKET = "post-media";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function listAll(prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back without an id; recurse into them.
      if (entry.id == null) paths.push(...(await listAll(full)));
      else paths.push(full);
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return paths;
}

async function main() {
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) throw bErr;
  if (!buckets?.some((b) => b.id === BUCKET)) {
    console.log(`Bucket "${BUCKET}" does not exist — nothing to do.`);
    return;
  }

  const paths = await listAll();
  console.log(`Found ${paths.length} object(s) in "${BUCKET}".`);
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) throw error;
    console.log(`Deleted ${Math.min(i + 100, paths.length)}/${paths.length}`);
  }

  const { error: dErr } = await supabase.storage.deleteBucket(BUCKET);
  if (dErr) throw dErr;
  console.log(`Bucket "${BUCKET}" deleted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
