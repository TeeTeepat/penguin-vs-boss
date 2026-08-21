import { listStudents, createStudent } from "../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const students = await listStudents();
  return Response.json({ students });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  const student = await createStudent(name);
  return Response.json({ student }, { status: 201 });
}
