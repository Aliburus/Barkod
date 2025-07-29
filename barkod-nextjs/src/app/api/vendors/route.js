import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Vendor from "../models/Vendor";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    let query = { status: { $ne: "deleted" } };

    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Vendor.countDocuments(query);

    return NextResponse.json({
      vendors: vendors.map((vendor) => ({
        ...vendor,
        _id: vendor._id.toString(),
        createdAt: vendor.createdAt.toString(),
        updatedAt: vendor.updatedAt.toString(),
      })),
      total,
    });
  } catch (error) {
    console.error("Vendors GET error:", error);
    return NextResponse.json(
      { error: "Tedarikçiler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const vendor = new Vendor({
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      taxNumber: body.taxNumber,
      contactPerson: body.contactPerson,
      notes: body.notes,
      status: body.status || "active",
    });

    const savedVendor = await vendor.save();

    return NextResponse.json({
      ...savedVendor.toObject(),
      _id: savedVendor._id.toString(),
      createdAt: savedVendor.createdAt.toString(),
      updatedAt: savedVendor.updatedAt.toString(),
    });
  } catch (error) {
    console.error("Vendor POST error:", error);
    return NextResponse.json(
      { error: "Tedarikçi eklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
