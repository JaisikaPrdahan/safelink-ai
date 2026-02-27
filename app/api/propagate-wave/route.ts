import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export async function POST() {
  try {
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .eq("status", "active");

    if (!incidents) {
      return NextResponse.json({ message: "No active incidents" });
    }

    for (const incident of incidents) {

      if (incident.incident_type === "intrusion") continue;

      const { data: burningCells } = await supabase
        .from("burning_cells")
        .select("*")
        .eq("incident_id", incident.incident_id);

      if (!burningCells || burningCells.length === 0) continue;

      const existingSet = new Set(
        burningCells.map(c => `${c.cell_x},${c.cell_y}`)
      );

      const newCells: any[] = [];

      for (const cell of burningCells) {

        for (const [dx, dy] of NEIGHBORS) {

          const nx = cell.cell_x + dx;
          const ny = cell.cell_y + dy;
          const key = `${nx},${ny}`;

          if (existingSet.has(key)) continue;

          // 🔥 STRUCTURED CORE + ORGANIC EDGE

          let expansionChance = 1;

          // severity affects aggressiveness
          if (incident.severity === 1) expansionChance = 0.6;
          if (incident.severity === 2) expansionChance = 0.8;
          if (incident.severity === 3) expansionChance = 1;

          if (Math.random() <= expansionChance) {
            newCells.push({
              incident_id: incident.incident_id,
              cell_x: nx,
              cell_y: ny,
            });
            existingSet.add(key);
          }
        }
      }

      if (newCells.length > 0) {
        await supabase.from("burning_cells").insert(newCells);
      }
    }

    return NextResponse.json({ message: "Structured + organic wave expanded" });

  } catch (error) {
    console.error("PROPAGATE ERROR:", error);
    return NextResponse.json(
      { error: "Propagation failed" },
      { status: 500 }
    );
  }
}