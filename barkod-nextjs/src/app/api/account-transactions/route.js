import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import AccountTransaction from "../models/AccountTransaction";
import Customer from "../models/Customer";

export async function GET(req) {
  await connectDB();
  const url = new URL(req.url);
  const customer = url.searchParams.get("customer");
  let filter = {};
  if (customer) filter = { customer };
  const transactions = await AccountTransaction.find(filter)
    .populate("customer")
    .sort({ date: -1 });
  return NextResponse.json(transactions);
}

export async function POST(req) {
  await connectDB();
  const data = await req.json();
  const transaction = await AccountTransaction.create(data);
  return NextResponse.json(transaction);
}
