import { notFound } from "next/navigation";
import OrderSuccessContent from "./OrderSuccessContent";
import { getOrderById } from "@/lib/order/queries";

type Props = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;

  if (!order) {
    notFound();
  }

  const foundOrder = await getOrderById(order);

  if (!foundOrder) {
    notFound();
  }

  return <OrderSuccessContent orderId={foundOrder.id} />;
}
