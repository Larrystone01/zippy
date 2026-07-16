"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

// Leaflet's default marker icons reference files that don't bundle well with
// webpack, so we rebuild them from CDN URLs.
const icon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

export type LatLng = { lat: number; lng: number };

interface MapProps {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  rider?: LatLng | null;
  /** If provided, clicking the map sets pickup (first click) then dropoff (second click). */
  onPickPoint?: (point: LatLng, which: "pickup" | "dropoff") => void;
  height?: number | string;
  center?: LatLng;
  zoom?: number;
}

export default function Map({
  pickup,
  dropoff,
  rider,
  onPickPoint,
  height = 320,
  center = { lat: 6.5244, lng: 3.3792 }, // Lagos, NG default
  zoom = 12,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ pickup?: L.Marker; dropoff?: L.Marker; rider?: L.Marker }>({});
  const lineRef = useRef<L.Polyline | null>(null);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (onPickPoint) {
      let clickedPickup = false;
      map.on("click", (e: L.LeafletMouseEvent) => {
        const point = { lat: e.latlng.lat, lng: e.latlng.lng };
        onPickPoint(point, clickedPickup ? "dropoff" : "pickup");
        clickedPickup = true;
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update markers whenever props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const upsert = (
      key: "pickup" | "dropoff" | "rider",
      point: LatLng | null | undefined,
      color: string,
      label: string
    ) => {
      if (!point) {
        markersRef.current[key]?.remove();
        markersRef.current[key] = undefined;
        return;
      }
      if (markersRef.current[key]) {
        markersRef.current[key]!.setLatLng([point.lat, point.lng]);
      } else {
        markersRef.current[key] = L.marker([point.lat, point.lng], { icon: icon(color) })
          .addTo(map)
          .bindTooltip(label);
      }
    };

    upsert("pickup", pickup, "#2563eb", "Pickup");
    upsert("dropoff", dropoff, "#16a34a", "Drop-off");
    upsert("rider", rider, "#f59e0b", "Rider");

    // draw a line between pickup and dropoff
    lineRef.current?.remove();
    if (pickup && dropoff) {
      lineRef.current = L.polyline(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { color: "#6b7280", dashArray: "6 6", weight: 2 }
      ).addTo(map);
      map.fitBounds(lineRef.current.getBounds(), { padding: [40, 40] });
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    } else if (rider) {
      map.setView([rider.lat, rider.lng], 14);
    }
  }, [pickup, dropoff, rider]);

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl" />;
}
