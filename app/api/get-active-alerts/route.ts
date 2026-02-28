import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: activeIncidents, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .eq("status", "active");

    if (incidentError) {
      console.error("INCIDENT FETCH ERROR:", incidentError);
      return NextResponse.json([]);
    }

    if (!activeIncidents || activeIncidents.length === 0) {
      return NextResponse.json([]);
    }

    const incidentIds = activeIncidents.map(i => i.incident_id);

    const { data: alerts, error: alertError } = await supabase
      .from("alerts")
      .select("*")
      .in("incident_id", incidentIds);

    if (alertError) {
      console.error("ALERT FETCH ERROR:", alertError);
      return NextResponse.json([]);
    }

    const merged = alerts.map(alert => {
      const incident = activeIncidents.find(
        i => i.incident_id === alert.incident_id
      );

      return {
        node_id: alert.node_id,
        confirmed: alert.confirmed,
        incidents: incident ? [incident] : [],
      };
    });

    return NextResponse.json(merged);
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json([]);
  }
}