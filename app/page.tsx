"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
});

type Household = {
  node_id: string;
  latitude: number;
  longitude: number;
};

export default function Home() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedNode, setSelectedNode] = useState("");
  const [incidentType, setIncidentType] = useState("fire");
  const [severity, setSeverity] = useState(1);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    fetch("/api/get-households")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setHouseholds(data));
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetch("/api/get-burning-cells");
      const cells = await res.json();
      setLiveCount(Array.isArray(cells) ? cells.length : 0);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const triggerIncident = async () => {
    await fetch("/api/report-incident", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originNodeId: selectedNode,
        title: `${incidentType.toUpperCase()} detected`,
        description: "Simulated sensor event",
        incidentType,
        severity: incidentType === "intrusion" ? 1 : severity,
      }),
    });
  };

  const expandRisk = async () => {
    await fetch("/api/propagate-risk", { method: "POST" });
  };

  const resolveIncident = async () => {
    try {
      const res = await fetch("/api/get-active-incidents");
      const incidents = await res.json();

      if (!Array.isArray(incidents) || incidents.length === 0) {
        return;
      }

      const latest = incidents[0];

      await fetch("/api/resolve-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: latest.incident_id,
        }),
      });

      window.dispatchEvent(new Event("simulation-reset"));
      setLiveCount(0);
    } catch (err) {
      console.error("Resolve failed:", err);
    }
  };

  const resetSimulation = async () => {
    await fetch("/api/reset-incidents", { method: "POST" });
    window.dispatchEvent(new Event("simulation-reset"));
    setLiveCount(0);
  };

  const isSafe = liveCount === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d1e60] via-[#3b1f7a] to-[#0f1025] text-white p-8">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-pink-400 bg-clip-text text-transparent">
            SafeLink AI
          </h1>
        </div>

        <div className={`px-6 py-2 rounded-full text-sm font-semibold border transition-all ${
          isSafe
            ? "bg-green-500/20 text-green-300 border-green-400 shadow-green-500/30 shadow-lg"
            : "bg-red-500/20 text-red-300 border-red-400 shadow-red-500/30 shadow-lg"
        }`}>
          ● NEIGHBORHOOD STATUS: {isSafe ? "SAFE" : "INCIDENT ACTIVE"}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">

        {/* SIDEBAR */}
        <div className="col-span-1 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl space-y-6">

          <div>
            <label className="text-sm text-gray-300 mb-2 block">
              🔥 Select Tower
            </label>
            <select
              className="w-full bg-white/10 text-white p-2 rounded-lg border border-white/20 appearance-none focus:outline-none"
              style={{ colorScheme: "light" }}
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              <option className="text-black bg-white" value="">
                -- Select Tower --
              </option>
              {households.map((house, index) => (
                <option
                  key={house.node_id}
                  value={house.node_id}
                  className="text-black bg-white"
                >
                  Tower {index + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300 mb-2 block">
              🚨 Incident Type
            </label>
            <select
              className="w-full bg-white/10 text-white p-2 rounded-lg border border-white/20 appearance-none focus:outline-none"
              style={{ colorScheme: "light" }}
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
            >
              <option className="text-black bg-white" value="fire">Fire</option>
              <option className="text-black bg-white" value="gas">Gas Leak</option>
              <option className="text-black bg-white" value="intrusion">Intrusion</option>
            </select>
          </div>

          {incidentType !== "intrusion" && (
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                ⚡ Severity
              </label>
              <select
                className="w-full bg-white/10 text-white p-2 rounded-lg border border-white/20 appearance-none focus:outline-none"
                style={{ colorScheme: "light" }}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
              >
                <option className="text-black bg-white" value={1}>Low</option>
                <option className="text-black bg-white" value={2}>Medium</option>
                <option className="text-black bg-white" value={3}>High</option>
              </select>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              onClick={triggerIncident}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:scale-105 transition"
            >
              🚨 Trigger Incident
            </button>

            <button
              onClick={expandRisk}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:scale-105 transition"
            >
              📈 Expand Risk
            </button>

            <button
              onClick={resolveIncident}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105 transition"
            >
              ✅ Resolve Incident
            </button>

            <button
              onClick={resetSimulation}
              className="w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
            >
              🔄 Reset
            </button>
          </div>

          <div className="mt-6 bg-white/10 rounded-xl p-4 text-center border border-white/20">
            <p className="text-xs text-gray-300">ACTIVE RISK CELLS</p>
            <p className="text-3xl font-bold mt-1">{liveCount}</p>
          </div>
        </div>

        {/* MAP AREA */}
        <div className="col-span-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden relative">

          <MapView />
        </div>
      </div>
    </div>
  );
}