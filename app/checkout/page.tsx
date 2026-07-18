import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "./CheckOutForm";

export default async function CheckoutPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return <CheckoutForm user={user} />;
}
