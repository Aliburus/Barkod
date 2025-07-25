import dbConnect from "../../utils/db";
const Company = require("../../models/Company");

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
