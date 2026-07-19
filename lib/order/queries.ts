import { createAdminClient } from "@/lib/supabase/admin";

export async function getOrderById(id: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
