import { NextResponse } from "next/server";
import connectDB from "../../utils/db.js";
import SubCustomer from "../../models/SubCustomer";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const customerId = searchParams.get("customerId");

  try {
    let query = { status: "active" };

    // Müşteri ID'si varsa filtrele
    if (customerId) {
      query.customerId = customerId;
    }

    // Arama terimi varsa filtrele
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const subCustomers = await SubCustomer.find(query)
      .select("name phone id _id")
      .limit(10)
      .sort({ name: 1 });

    return NextResponse.json(subCustomers);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
