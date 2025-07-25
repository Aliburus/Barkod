import dbConnect from "../utils/db";
const Company = require("../models/Company");

export async function GET() {
  await dbConnect();
  const companies = await Company.find({}).sort({ createdAt: -1 });
  return Response.json(companies);
}

export async function POST(req) {
  await dbConnect();
  const data = await req.json();
  const company = await Company.create(data);
  return Response.json(company);
}
