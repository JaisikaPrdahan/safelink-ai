import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // 1️⃣ Resolve incidents
    await supabase
      .from("incidents")
      .update({ status: "resolved" })
      .eq("status", "active");

    // 2️⃣ Delete alerts
    await supabase
      .from("alerts")
      .delete()
      .neq("node_id", "___never_match___");

    // 3️⃣ 🔥 CLEAR GRID
    await supabase
      .from("burning_cells")
      .delete()
      .neq("cell_x", -999999);

    return NextResponse.json({ message: "Simulation reset" });
  } catch (error) {
    console.error("RESET FAILED:", error);
    return NextResponse.json(
      { error: "Reset failed" },
      { status: 500 }
    );
  }
}