import { createAdminClient } from "../supabase/admin";
export async function claimGuestOrders(email: string, customerId: string) {
  const admin = createAdminClient();

  console.log("Claiming orders for:", email, customerId);

  const { data: before } = await admin
    .from("orders")
    .select("id, customer_email, customer_id")
    .eq("customer_email", email.toLowerCase());

  console.log("Before update:", before);

  const { data, error } = await admin
    .from("orders")
    .update({
      customer_id: customerId,
    })
    .eq("customer_email", email.toLowerCase())
    .is("customer_id", null)
    .select();

  console.log("Updated rows:", data);
  console.log("Update error:", error);

  const { data: after } = await admin
    .from("orders")
    .select("id, customer_email, customer_id")
    .eq("customer_email", email.toLowerCase());

  console.log("After update:", after);

  if (error) throw error;
}
