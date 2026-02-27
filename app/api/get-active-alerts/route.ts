import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from("alerts")
    .select(`
      node_id,
      incidents!inner(status, incident_type, severity)
    `)
    .eq("incidents.status", "active");

  return NextResponse.json(data ?? []);
}