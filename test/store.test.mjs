import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// The file store resolves .data relative to process.cwd(), so chdir to a
// temp dir before importing anything and the repo .data stays untouched.
const workDir = await mkdtemp(path.join(tmpdir(), "mutiply-store-"));
process.chdir(workDir);

const {
  listStudents,
  createStudent,
  getStudent,
  updateStudent,
  deleteStudent,
} = await import("../lib/store.js");

test("file store end to end", async (t) => {
  t.after(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  await t.test("create defaults", async () => {
    const student = await createStudent("Alice");
    assert.ok(student.id);
    assert.equal(student.name, "Alice");
    assert.equal(student.min, 2);
    assert.equal(student.max, 12);
    assert.deepEqual(student.levels, {});
    assert.deepEqual(student.weak, {});
  });

  await t.test("list returns id and name only", async () => {
    await createStudent("Bob");
    const students = await listStudents();
    assert.equal(students.length, 2);
    assert.deepEqual(Object.keys(students[0]).sort(), ["id", "name"]);
    assert.deepEqual(students.map((s) => s.name).sort(), ["Alice", "Bob"]);
  });

  await t.test("get returns the full record", async () => {
    const [{ id }] = await listStudents();
    const student = await getStudent(id);
    assert.equal(student.id, id);
    assert.ok("min" in student && "max" in student && "levels" in student && "weak" in student);
  });

  await t.test("patch min, max, levels, weak", async () => {
    const [{ id }] = await listStudents();
    const patched = await updateStudent(id, {
      min: 6,
      max: 8,
      levels: { normal: 3 },
      weak: { "7x8": { streak: 1 } },
    });
    assert.equal(patched.min, 6);
    assert.equal(patched.max, 8);
    assert.deepEqual(patched.levels, { normal: 3 });
    assert.deepEqual(patched.weak, { "7x8": { streak: 1 } });
    const reread = await getStudent(id);
    assert.deepEqual(reread, patched);
  });

  await t.test("patch ignores unknown keys", async () => {
    const [{ id }] = await listStudents();
    const before = await getStudent(id);
    const patched = await updateStudent(id, { name: "Hacked", id: "other", bogus: 1, min: 3 });
    assert.equal(patched.name, before.name);
    assert.equal(patched.id, before.id);
    assert.equal(patched.bogus, undefined);
    assert.equal(patched.min, 3);
  });

  await t.test("delete removes the record", async () => {
    const students = await listStudents();
    const target = students.find((s) => s.name === "Bob");
    const ok = await deleteStudent(target.id);
    assert.equal(ok, true);
    const after = await listStudents();
    assert.equal(after.length, students.length - 1);
    assert.ok(!after.some((s) => s.id === target.id));
  });

  await t.test("get missing returns null", async () => {
    assert.equal(await getStudent("00000000-0000-0000-0000-000000000000"), null);
  });
});
