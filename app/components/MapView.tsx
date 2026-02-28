"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Rectangle,
} from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

const CELL_SIZE = 50;
const BASE_LAT = 17.4675;
const BASE_LNG = 78.3071;

type Household = {
  node_id: string;
  latitude: number;
  longitude: number;
};

type Alert = {
  node_id: string;
  confirmed?: boolean; // ✅ needed for origin detection
  incidents:
    | {
        status: string;
        incident_type: string;
        severity: number;
      }[]
    | null;
};

type BurningCell = {
  incident_id: string;
  cell_x: number;
  cell_y: number;
  risk_level: number;
  decay_factor: number;
};

export default function MapView() {
  const [mounted, setMounted] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [burningCells, setBurningCells] = useState<BurningCell[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/get-households")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setHouseholds(data))
      .catch(() => setHouseholds([]));
  }, []);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("/api/get-active-alerts")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setAlerts(data));
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCells = () => {
      fetch("/api/get-burning-cells")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setBurningCells(data));
    };
    fetchCells();
    const interval = setInterval(fetchCells, 2000);
    return () => clearInterval(interval);
  }, []);

  const cellToBounds = (
    gx: number,
    gy: number
  ): [[number, number], [number, number]] => {
    const lat = BASE_LAT + (gy * CELL_SIZE) / 110540;
    const lng = BASE_LNG + (gx * CELL_SIZE) / 111320;

    const height = CELL_SIZE / 110540;
    const width = CELL_SIZE / 111320;

    return [
      [lat, lng],
      [lat + height, lng + width],
    ];
  };

  const center: LatLngExpression = [17.4675, 78.3071];

  if (!mounted) return null;

  return (
    <MapContainer
      center={center}
      zoom={17}
      className="h-full w-full"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* GRID LAYER */}
      {burningCells.map((cell, i) => (
        <Rectangle
          key={i}
          bounds={cellToBounds(cell.cell_x, cell.cell_y)}
          pathOptions={{
            color: "red",
            fillColor: "red",
            fillOpacity: 0.3,
            weight: 0,
          }}
        />
      ))}

      {/* HOUSE LAYER */}
      {households.map((house, index) => {
        const position: LatLngExpression = [
          house.latitude,
          house.longitude,
        ];

        const alert = alerts.find((a) => a.node_id === house.node_id);

        const xMeters =
          (house.longitude - BASE_LNG) * 111320;
        const yMeters =
          (house.latitude - BASE_LAT) * 110540;

        const gx = Math.floor(xMeters / CELL_SIZE);
        const gy = Math.floor(yMeters / CELL_SIZE);

        let maxFireRisk = 0;

        for (const cell of burningCells) {
          const dx = cell.cell_x - gx;
          const dy = cell.cell_y - gy;
          const cellDistance = Math.sqrt(dx * dx + dy * dy);

          let radius = 1;
          if (cell.risk_level > 70) radius = 3;
          else if (cell.risk_level > 40) radius = 2;

          if (cellDistance <= radius) {
            const adjustedRisk =
              cell.risk_level *
              Math.pow(cell.decay_factor, cellDistance);

            if (adjustedRisk > maxFireRisk) {
              maxFireRisk = adjustedRisk;
            }
          }
        }

        let color = "green";

        // ✅ CORRECTED INTRUSION LOGIC
        if (
          alert?.incidents &&
          Array.isArray(alert.incidents) &&
          alert.incidents.length > 0 &&
          alert.incidents[0].incident_type === "intrusion"
        ) {
          if (alert.confirmed) {
            color = "purple"; // origin node
          } else {
            color = "yellow"; // neighboring nodes
          }
        } else if (maxFireRisk > 75) {
          color = "red";
        } else if (maxFireRisk > 45) {
          color = "orange";
        } else if (maxFireRisk > 15) {
          color = "yellow";
        }

        return (
          <CircleMarker
            key={house.node_id}
            center={position}
            radius={8}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.9,
            }}
          >
            <Popup>
  <div style={{ minWidth: "160px" }}>
    <strong>Tower {index + 1}</strong>
    <br />
    Node ID: {house.node_id.slice(0, 8)}...
    <br />

    {/* 🔥 FIRE / GAS INCIDENT DISPLAY */}
    {maxFireRisk > 0 && (
      <>
        <br />
        🚨 Incident: <strong>Environmental Threat</strong>
        <br />
        🔥 Risk Level: <strong>{Math.round(maxFireRisk)}</strong>
      </>
    )}

    {/* 🟣 INTRUSION DISPLAY */}
    {alert?.incidents &&
      Array.isArray(alert.incidents) &&
      alert.incidents.length > 0 &&
      alert.incidents[0].incident_type === "intrusion" && (
        <>
          <br />
          🚨 Incident: <strong>Intrusion</strong>
          <br />
          ⚠ Severity:{" "}
          <strong>{alert.incidents[0].severity}</strong>
        </>
      )}

    {/* ✅ SAFE STATE */}
    {maxFireRisk === 0 &&
      (!alert?.incidents ||
        alert.incidents.length === 0) && (
        <>
          <br />
          ✅ No Active Incident
        </>
      )}
  </div>
</Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}