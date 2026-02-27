import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const { data: cells } = await supabase
    .from("burning_cells")
    .select("*");

  if (!cells || cells.length === 0) {
    return NextResponse.json({ message: "No active cells" });
  }

  const newCells = [];

  for (const cell of cells) {
    const { cell_x, cell_y, risk_level, decay_factor, incident_id } = cell;

    const neighbors = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];

    for (const [dx, dy] of neighbors) {
      const newRisk = risk_level * decay_factor;

      if (newRisk < 20) continue;

      newCells.push({
        incident_id,
        cell_x: cell_x + dx,
        cell_y: cell_y + dy,
        risk_level: newRisk,
        decay_factor,
      });
    }
  }

  if (newCells.length > 0) {
    await supabase.from("burning_cells").insert(newCells);
  }

  return NextResponse.json({ message: "Risk propagated" });
}