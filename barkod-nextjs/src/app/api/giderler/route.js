import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Expense from "../models/Expense";

export async function GET() {
  await connectDB();
  try {
    const expenses = await Expense.find({
      $or: [{ status: "active" }, { status: { $exists: false } }],
    }).sort({ createdAt: -1 });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const expense = new Expense({ ...body, status: "active" }); // her zaman status: active
    await expense.save();
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  await connectDB();
  try {
    const { id } = await request.json();
    await Expense.findByIdAndUpdate(id, { status: "deleted" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
