import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Customer from "../models/Customer";

export async function GET() {
  await connectDB();
  const customers = await Customer.find().sort({ createdAt: -1 });
  return NextResponse.json(customers);
}

export async function POST(req) {
  await connectDB();
  const data = await req.json();
  const customer = await Customer.create(data);
  return NextResponse.json(customer);
}

export async function PATCH(req) {
  await connectDB();
  const { id, ...update } = await req.json();
  const customer = await Customer.findByIdAndUpdate(id, update, { new: true });
  return NextResponse.json(customer);
}
