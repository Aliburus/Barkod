import dbConnect from "../../utils/db";
import Company from "../../models/Company.js";

export async function DELETE(req, { params }) {
  await dbConnect();
  const { id } = await params;
  await Company.findByIdAndDelete(id);
  return Response.json({ success: true });
}

export async function GET(req, { params }) {
  await dbConnect();
  const { id } = await params;
  const company = await Company.findById(id);
  if (!company) return new Response("Not found", { status: 404 });
  return Response.json(company);
}
