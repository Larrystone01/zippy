import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/order/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const order = getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(order);
  } catch {
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
