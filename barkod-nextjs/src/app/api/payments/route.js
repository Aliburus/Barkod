import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Payment from "../models/Payment";
import Debt from "../models/Debt";

export async function GET() {
  await connectDB();
  try {
    const payments = await Payment.find().sort({ date: -1 });
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const payment = new Payment(body);
    await payment.save();

    // Eğer borç ID'si belirtilmişse, borç kaydını güncelle
    if (body.debtId) {
      const debt = await Debt.findById(body.debtId);
      if (debt) {
        const newPaidAmount = debt.paidAmount + body.amount;
        debt.paidAmount = newPaidAmount;
        debt.isPaid = newPaidAmount >= debt.amount;
        await debt.save();
      }
    }
    // Eğer customerId varsa ve debtId yoksa, müşterinin borçlarını otomatik güncelle
    else if (body.customerId) {
      const unpaidDebts = await Debt.find({
        customerId: body.customerId,
        isPaid: false,
      }).sort({ createdAt: 1 }); // En eski borçtan başla

      let remainingAmount = body.amount;

      for (const debt of unpaidDebts) {
        if (remainingAmount <= 0) break;

        const debtRemaining = debt.amount - debt.paidAmount;
        const paymentAmount = Math.min(remainingAmount, debtRemaining);

        debt.paidAmount += paymentAmount;
        debt.isPaid = debt.paidAmount >= debt.amount;
        await debt.save();

        remainingAmount -= paymentAmount;
      }
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
