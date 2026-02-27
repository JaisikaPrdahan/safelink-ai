import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { incidentId } = await req.json();

    if (!incidentId) {
      return NextResponse.json(
        { error: "incidentId required" },
        { status: 400 }
      );
    }

    // 1️⃣ Mark incident resolved
    await supabase
      .from("incidents")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("incident_id", incidentId);

    // 2️⃣ Delete its risk cells only
    await supabase
      .from("burning_cells")
      .delete()
      .eq("incident_id", incidentId);

    return NextResponse.json({
      message: "Incident resolved successfully",
    });
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}