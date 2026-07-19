import Link from "next/link";
import { CheckCircle2, LogIn, UserPlus, Package } from "lucide-react";

type Props = {
  orderId: string;
};

export default function OrderSuccessContent({ orderId }: Props) {
  return (
    <main className="min-h-screen bg-[#f8f4ec] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-[#e7dece] bg-[#fffdf9] p-8 shadow-sm">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef8f0]">
              <CheckCircle2
                className="h-10 w-10 text-green-600"
                strokeWidth={2.5}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-bold text-[#17130f]">
              Order Placed Successfully!
            </h1>

            <p className="mt-3 text-[#6f6253] leading-7">
              Thank you for choosing our delivery service. Your request has been
              received and will be processed shortly.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-[#e7dece] bg-[#faf7f2] p-5">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 text-[#8b6b3f]" />

              <div>
                <h2 className="font-semibold text-[#17130f]">
                  Want to track this order?
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6253]">
                  Since you placed this order as a guest, you'll need to create
                  an account or sign in using the{" "}
                  <strong>same email address</strong> you entered during
                  checkout.
                </p>

                <p className="mt-3 text-sm leading-6 text-[#6f6253]">
                  Once you sign in, we'll automatically link this order to your
                  account so you can track it from your dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href={`/signup?next=${encodeURIComponent(`/track/${orderId}`)}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#17130f] px-5 py-3 font-medium text-white transition hover:bg-[#2a241e]"
            >
              <UserPlus size={18} />
              Create Account
            </Link>

            <Link
              href={`/signin?next=${encodeURIComponent(`/track/${orderId}`)}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#17130f] px-5 py-3 font-medium text-[#17130f] transition hover:bg-[#17130f] hover:text-white"
            >
              <LogIn size={18} />
              Sign In
            </Link>
          </div>

          <div className="mt-8 border-t border-[#e7dece] pt-6 text-center">
            <p className="text-sm text-[#6f6253]">Need another delivery?</p>

            <Link
              href="/checkout"
              className="mt-3 inline-flex rounded-lg px-4 py-2 font-medium text-[#8b6b3f] transition hover:bg-[#f5efe6]"
            >
              Place another order
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
