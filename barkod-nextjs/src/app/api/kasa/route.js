import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Kasa from "../models/Kasa";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (date) {
    const kasa = await Kasa.findOne({ date });
    return NextResponse.json(kasa || {}, { status: 200 });
  }
  const all = await Kasa.find({});
  return NextResponse.json(all, { status: 200 });
}

export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const {
    date,
    tahsilat,
    tahsilatDesc,
    harcama,
    harcamaDesc,
    banka,
    bankaDesc,
  } = body;
  const kasa = new Kasa({
    date,
    tahsilat,
    tahsilatDesc,
    harcama,
    harcamaDesc,
    banka,
    bankaDesc,
  });
  await kasa.save();
  return NextResponse.json(kasa, { status: 201 });
}

export async function PUT(request) {
  await connectDB();
  const body = await request.json();
  const {
    date,
    tahsilat,
    tahsilatDesc,
    harcama,
    harcamaDesc,
    banka,
    bankaDesc,
  } = body;
  const kasa = await Kasa.findOneAndUpdate(
    { date },
    { tahsilat, tahsilatDesc, harcama, harcamaDesc, banka, bankaDesc },
    { new: true, upsert: true }
  );
  return NextResponse.json(kasa, { status: 200 });
}
