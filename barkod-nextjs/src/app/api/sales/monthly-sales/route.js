import { NextResponse } from "next/server";
import connectDB from "../../../api/utils/db";
import Sale from "../../../api/models/Sale";

export async function GET() {
  await connectDB();
  try {
    const sales = await Sale.aggregate([
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          total: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    return NextResponse.json(sales);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
