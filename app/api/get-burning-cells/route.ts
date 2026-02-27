import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("burning_cells")
    .select("*");

  if (error) {
    console.error("BURNING CELLS ERROR:", error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}