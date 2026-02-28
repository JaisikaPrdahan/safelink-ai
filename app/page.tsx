"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

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
      try {
        const [cellsRes, alertsRes] = await Promise.all([
          fetch("/api/get-burning-cells"),
          fetch("/api/get-active-alerts"),
        ]);

        const cells = await cellsRes.json();
        const alerts = await alertsRes.json();

        const burningCount = Array.isArray(cells) ? cells.length : 0;
        const intrusionActive =
          Array.isArray(alerts) && alerts.length > 0;

        setLiveCount(burningCount + (intrusionActive ? 1 : 0));
      } catch (err) {
        console.error("Status count error:", err);
        setLiveCount(0);
      }
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#0f0c29] text-white"
    >
      <div className="h-full flex flex-col">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center px-8 py-6"
        >
          <div className="px-6 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-pink-400 bg-clip-text text-transparent">
              SafeLink AI
            </h1>
          </div>

          <motion.div
            animate={
              !isSafe
                ? {
                    boxShadow: [
                      "0 0 10px rgba(239,68,68,0.5)",
                      "0 0 30px rgba(239,68,68,0.8)",
                      "0 0 10px rgba(239,68,68,0.5)",
                    ],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: 2 }}
            className={`px-6 py-2 rounded-full text-sm font-semibold border ${
              isSafe
                ? "bg-green-500/20 text-green-300 border-green-400"
                : "bg-red-500/20 text-red-300 border-red-400"
            }`}
          >
            ● NEIGHBORHOOD STATUS: {isSafe ? "SAFE" : "INCIDENT ACTIVE"}
          </motion.div>
        </motion.div>

        <div className="flex-1 grid grid-cols-[380px_1fr] gap-6 px-8 pb-8 h-full">

          {/* SIDEBAR */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="bg-white/5 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-[0_0_60px_rgba(139,92,246,0.2)] space-y-6"
          >
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                🔥 Select Tower
              </label>
              <select
                className="w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 focus:outline-none"
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
                className="w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 focus:outline-none"
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
                  className="w-full bg-white/10 text-white p-3 rounded-xl border border-white/20 focus:outline-none"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                >
                  <option className="text-black bg-white" value={1}>Low</option>
                  <option className="text-black bg-white" value={2}>Medium</option>
                  <option className="text-black bg-white" value={3}>High</option>
                </select>
              </div>
            )}

            <div className="space-y-4 pt-4">
              {[
                { text: "🚨 Trigger Incident", action: triggerIncident, color: "from-red-500 to-pink-500" },
                { text: "📈 Expand Risk", action: expandRisk, color: "from-yellow-500 to-orange-500" },
                { text: "✅ Resolve Incident", action: resolveIncident, color: "from-green-500 to-emerald-500" },
                { text: "🔄 Reset", action: resetSimulation, color: "from-gray-500 to-gray-600" },
              ].map((btn, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 220 }}
                  onClick={btn.action}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r ${btn.color}`}
                >
                  {btn.text}
                </motion.button>
              ))}
            </div>

            <div className="mt-6 bg-white/5 rounded-2xl p-6 text-center border border-white/10">
              <p className="text-xs text-gray-400 tracking-wider">
                ACTIVE RISK CELLS
              </p>
              <p className="text-4xl font-bold mt-2">{liveCount}</p>
            </div>
          </motion.div>

          {/* MAP */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 80 }}
            className="h-full min-h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(139,92,246,0.15)]"
          >
            <MapView />
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}