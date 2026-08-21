/* Data access for API routes. Supabase when configured, else a local JSON file.
   ponytail: file store is dev-only; Supabase is the deployed path (ADR-0001) */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PATCH_KEYS = ["min", "max", "levels", "weak"];

function cleanPatch(patch) {
  const out = {};
  for (const key of PATCH_KEYS) {
    if (patch && patch[key] !== undefined) out[key] = patch[key];
  }
  return out;
}

const useSupabase = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let supabaseClient = null;
async function getSupabase() {
  if (!supabaseClient) {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return supabaseClient;
}

const filePath = () => path.join(process.cwd(), ".data", "students.json");

async function readAll() {
  try {
    return JSON.parse(await readFile(filePath(), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(students) {
  await mkdir(path.dirname(filePath()), { recursive: true });
  await writeFile(filePath(), JSON.stringify(students, null, 2));
}

export async function listStudents() {
  if (useSupabase()) {
    const sb = await getSupabase();
    const { data, error } = await sb.from("students").select("id, name").order("name");
    if (error) throw new Error(error.message);
    return data;
  }
  return (await readAll()).map(({ id, name }) => ({ id, name }));
}

export async function createStudent(name) {
  const student = { name, min: 2, max: 12, levels: {}, weak: {} };
  if (useSupabase()) {
    const sb = await getSupabase();
    const { data, error } = await sb.from("students").insert(student).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const record = { id: randomUUID(), ...student };
  const students = await readAll();
  students.push(record);
  await writeAll(students);
  return record;
}

export async function getStudent(id) {
  if (useSupabase()) {
    const sb = await getSupabase();
    const { data, error } = await sb.from("students").select().eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  return (await readAll()).find((s) => s.id === id) ?? null;
}

export async function updateStudent(id, patch) {
  const clean = cleanPatch(patch);
  if (useSupabase()) {
    const sb = await getSupabase();
    if (!Object.keys(clean).length) return getStudent(id);
    const { data, error } = await sb
      .from("students")
      .update(clean)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  const students = await readAll();
  const index = students.findIndex((s) => s.id === id);
  if (index === -1) return null;
  students[index] = { ...students[index], ...clean };
  await writeAll(students);
  return students[index];
}

export async function deleteStudent(id) {
  if (useSupabase()) {
    const sb = await getSupabase();
    const { error } = await sb.from("students").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
  const students = await readAll();
  await writeAll(students.filter((s) => s.id !== id));
  return true;
}
