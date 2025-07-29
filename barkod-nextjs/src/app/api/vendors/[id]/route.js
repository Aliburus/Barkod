import { NextResponse } from "next/server";
import connectDB from "../../utils/db.js";
import Vendor from "../../models/Vendor";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // MongoDB timeout ayarları
    const vendor = await Vendor.findById(id).lean().maxTimeMS(25000); // 25 saniye timeout

    if (!vendor) {
      return NextResponse.json(
        { error: "Tedarikçi bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...vendor,
      _id: vendor._id.toString(),
      createdAt: vendor.createdAt.toString(),
      updatedAt: vendor.updatedAt.toString(),
    });
  } catch (error) {
    console.error("Vendor GET error:", error);

    // MongoDB timeout hatası kontrolü
    if (error.message && error.message.includes("timeout")) {
      return NextResponse.json(
        {
          error:
            "Veritabanı bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin.",
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: "Tedarikçi yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      {
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        taxNumber: body.taxNumber,
        contactPerson: body.contactPerson,
        notes: body.notes,
        status: body.status,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!updatedVendor) {
      return NextResponse.json(
        { error: "Tedarikçi bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...updatedVendor,
      _id: updatedVendor._id.toString(),
      createdAt: updatedVendor.createdAt.toString(),
      updatedAt: updatedVendor.updatedAt.toString(),
    });
  } catch (error) {
    console.error("Vendor PUT error:", error);
    return NextResponse.json(
      { error: "Tedarikçi güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedVendor = await Vendor.findByIdAndUpdate(
      id,
      { status: "deleted", updatedAt: new Date() },
      { new: true }
    );

    if (!deletedVendor) {
      return NextResponse.json(
        { error: "Tedarikçi bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Tedarikçi başarıyla silindi" });
  } catch (error) {
    console.error("Vendor DELETE error:", error);
    return NextResponse.json(
      { error: "Tedarikçi silinirken hata oluştu" },
      { status: 500 }
    );
  }
}
