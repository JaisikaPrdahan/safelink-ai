import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_LAT = 17.4675;
const BASE_LNG = 78.3071;
const CELL_SIZE = 50;

export async function POST(req: Request) {
  try {
    const { originNodeId, title, description, incidentType, severity } =
      await req.json();

    const { data: origin } = await supabase
      .from("households")
      .select("*")
      .eq("node_id", originNodeId)
      .single();

    if (!origin) {
      return NextResponse.json(
        { error: "Origin not found" },
        { status: 404 }
      );
    }

    const { data: incident } = await supabase
      .from("incidents")
      .insert({
        origin_node_id: originNodeId,
        title,
        description,
        incident_type: incidentType,
        severity,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!incident) {
      return NextResponse.json(
        { error: "Failed to create incident" },
        { status: 500 }
      );
    }

    if (incidentType === "intrusion") {
      return NextResponse.json({
        message: "Intrusion alert triggered",
        affectedCount: 1,
      });
    }

    const severityConfig: Record<number, { risk: number; decay: number }> = {
      1: { risk: 40, decay: 0.6 },
      2: { risk: 70, decay: 0.75 },
      3: { risk: 100, decay: 0.85 },
    };

    const config = severityConfig[severity] || severityConfig[1];

    const xMeters =
      (origin.longitude - BASE_LNG) * 111320;

    const yMeters =
      (origin.latitude - BASE_LAT) * 110540;

    const gx = Math.floor(xMeters / CELL_SIZE);
    const gy = Math.floor(yMeters / CELL_SIZE);

    await supabase.from("burning_cells").insert({
      incident_id: incident.incident_id,
      cell_x: gx,
      cell_y: gy,
      risk_level: config.risk,
      decay_factor: config.decay,
    });

    return NextResponse.json({
      message: "Incident created",
      affectedCount: 1,
    });
  } catch (error) {
    console.error("REPORT INCIDENT ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}