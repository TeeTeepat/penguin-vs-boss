import { getStudent, updateStudent, deleteStudent } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ student });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const patch = await request.json().catch(() => ({}));
  const student = await updateStudent(id, patch);
  if (!student) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ student });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await deleteStudent(id);
  return Response.json({ ok: true });
}
