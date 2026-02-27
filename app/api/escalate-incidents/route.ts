import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .eq("status", "active");

    for (const incident of incidents || []) {

      // 🚨 Intrusion never escalates
      if (incident.incident_type === "intrusion") continue;

      const started = new Date(incident.started_at).getTime();
      const now = Date.now();
      const minutes = (now - started) / 60000;

      let newSeverity = incident.severity;

      if (minutes > 2 && incident.severity < 3) {
        newSeverity = 3;
      } else if (minutes > 1 && incident.severity < 2) {
        newSeverity = 2;
      }

      if (newSeverity !== incident.severity) {
        await supabase
          .from("incidents")
          .update({ severity: newSeverity })
          .eq("incident_id", incident.incident_id);
      }
    }

    return NextResponse.json({ message: "Escalation processed" });

  } catch (error) {
    console.error("ESCALATION ERROR:", error);
    return NextResponse.json({ error: "Escalation failed" }, { status: 500 });
  }
}