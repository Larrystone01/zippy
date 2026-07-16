"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LatLng } from "@/components/Map";

// Leaflet touches `window` on import, so it must never be rendered on the server.
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const BASE_FARE: Record<string, number> = {
  small: 1200,
  medium: 2000,
  large: 3500,
};
const PER_KM = 150;
const AUTOCOMPLETE_DEBOUNCE_MS = 400;

type Suggestion = { label: string; point: LatLng };

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function reverseGeocode(point: LatLng): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

async function forwardGeocode(query: string): Promise<Suggestion[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query,
      )}&addressdetails=0&limit=5`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(
      (item: { display_name: string; lat: string; lon: string }) => ({
        label: item.display_name,
        point: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
      }),
    );
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const supabase = createClient();
  const router = useRouter();

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupLoading, setPickupLoading] = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);

  const [pickupSuggestions, setPickupSuggestions] = useState<Suggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<Suggestion[]>(
    [],
  );
  const [pickupSearching, setPickupSearching] = useState(false);
  const [dropoffSearching, setDropoffSearching] = useState(false);
  const pickupDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropoffDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [size, setSize] = useState<"small" | "medium" | "large">("small");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distanceKm = useMemo(
    () => (pickup && dropoff ? haversineKm(pickup, dropoff) : 0),
    [pickup, dropoff],
  );
  const price = useMemo(
    () =>
      distanceKm ? BASE_FARE[size] + distanceKm * PER_KM : BASE_FARE[size],
    [distanceKm, size],
  );

  useEffect(() => {
    return () => {
      if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
      if (dropoffDebounce.current) clearTimeout(dropoffDebounce.current);
    };
  }, []);

  const handlePick = async (point: LatLng, which: "pickup" | "dropoff") => {
    if (which === "pickup") {
      setPickup(point);
      setPickupSuggestions([]);
      setPickupLoading(true);
      const address = await reverseGeocode(point);
      setPickupAddress(
        address ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      );
      setPickupLoading(false);
    } else {
      setDropoff(point);
      setDropoffSuggestions([]);
      setDropoffLoading(true);
      const address = await reverseGeocode(point);
      setDropoffAddress(
        address ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      );
      setDropoffLoading(false);
    }
  };

  const handleAddressInput = (which: "pickup" | "dropoff", value: string) => {
    if (which === "pickup") {
      setPickupAddress(value);
      if (pickupDebounce.current) clearTimeout(pickupDebounce.current);
      if (value.trim().length < 3) {
        setPickupSuggestions([]);
        return;
      }
      pickupDebounce.current = setTimeout(async () => {
        setPickupSearching(true);
        const results = await forwardGeocode(value);
        setPickupSuggestions(results);
        setPickupSearching(false);
      }, AUTOCOMPLETE_DEBOUNCE_MS);
    } else {
      setDropoffAddress(value);
      if (dropoffDebounce.current) clearTimeout(dropoffDebounce.current);
      if (value.trim().length < 3) {
        setDropoffSuggestions([]);
        return;
      }
      dropoffDebounce.current = setTimeout(async () => {
        setDropoffSearching(true);
        const results = await forwardGeocode(value);
        setDropoffSuggestions(results);
        setDropoffSearching(false);
      }, AUTOCOMPLETE_DEBOUNCE_MS);
    }
  };

  const selectSuggestion = (
    which: "pickup" | "dropoff",
    suggestion: Suggestion,
  ) => {
    if (which === "pickup") {
      setPickup(suggestion.point);
      setPickupAddress(suggestion.label);
      setPickupSuggestions([]);
    } else {
      setDropoff(suggestion.point);
      setDropoffAddress(suggestion.label);
      setDropoffSuggestions([]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pickup || !dropoff) {
      setError(
        "Please set both a pickup and drop-off point (search an address or click the map).",
      );
      return;
    }
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setError("Please add a pickup and drop-off address.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push("/auth/signin?next=/checkout");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        pickup_address: pickupAddress,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoffAddress,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        package_size: size,
        package_note: note,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        distance_km: distanceKm.toFixed(2),
        price: price.toFixed(2),
      })
      .select()
      .single();

    setLoading(false);

    if (error) return setError(error.message);
    router.push(`/track/${data.id}`);
  };

  return (
    <div className="lux-shell">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="lux-label">Dispatch booking</p>
          <h1 className="mt-3 text-4xl font-semibold text-[#17130f]">
            Book a delivery
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6253]">
            Type an address and pick a suggestion, or click the map directly to
            drop a pin.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e7dece] bg-white/75 px-5 py-3 text-sm shadow-sm">
          <span className="text-[#8b7f70]">Base fare</span>{" "}
          <span className="font-semibold text-[#17130f]">+ ₦{PER_KM}/km</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr]">
        <div className="lux-card overflow-hidden p-3">
          <Map
            pickup={pickup}
            dropoff={dropoff}
            onPickPoint={handlePick}
            height={520}
          />
        </div>

        <form onSubmit={submit} className="lux-card flex flex-col gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <input
                required
                placeholder={
                  pickupLoading ? "Looking up address…" : "Pickup address"
                }
                value={pickupAddress}
                onChange={(e) => handleAddressInput("pickup", e.target.value)}
                disabled={pickupLoading}
                autoComplete="off"
                className="lux-input"
              />
              {pickupLoading && (
                <p className="mt-2 text-xs text-[#8b7f70]">
                  Fetching address from map pin…
                </p>
              )}
              {pickupSearching && (
                <p className="mt-2 text-xs text-[#8b7f70]">Searching…</p>
              )}
              {pickupSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-2 w-full max-w-xs overflow-hidden rounded-xl border border-[#e7dece] bg-white shadow-[0_18px_45px_rgba(23,19,15,0.14)]">
                  {pickupSuggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={() => selectSuggestion("pickup", s)}
                        className="block w-full truncate px-3 py-2.5 text-left text-xs hover:bg-[#fffaf0]"
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative">
              <input
                required
                placeholder={
                  dropoffLoading ? "Looking up address…" : "Drop-off address"
                }
                value={dropoffAddress}
                onChange={(e) => handleAddressInput("dropoff", e.target.value)}
                disabled={dropoffLoading}
                autoComplete="off"
                className="lux-input"
              />
              {dropoffLoading && (
                <p className="mt-2 text-xs text-[#8b7f70]">
                  Fetching address from map pin…
                </p>
              )}
              {dropoffSearching && (
                <p className="mt-2 text-xs text-[#8b7f70]">Searching…</p>
              )}
              {dropoffSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-2 w-full max-w-xs overflow-hidden rounded-xl border border-[#e7dece] bg-white shadow-[0_18px_45px_rgba(23,19,15,0.14)]">
                  {dropoffSuggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={() => selectSuggestion("dropoff", s)}
                        className="block w-full truncate px-3 py-2.5 text-left text-xs hover:bg-[#fffaf0]"
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Recipient name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="lux-input"
            />
            <input
              placeholder="Recipient phone"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="lux-input"
            />
          </div>

          <textarea
            placeholder="Package notes (fragile, needs signature, etc.)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="lux-input"
            rows={3}
          />

          <div>
            <label className="lux-label">
              Package size
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition ${
                    size === s
                      ? "border-[#b2843a] bg-[#fff4dd] text-[#17130f]"
                      : "border-[#e7dece] bg-white/70 text-[#6f6253] hover:border-[#b2843a]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-[#dfd2bd] bg-[#17130f] p-5 text-white">
            <div className="flex justify-between text-sm text-white/65">
              <span>Distance</span>
              <span>{distanceKm ? `${distanceKm.toFixed(1)} km` : "—"}</span>
            </div>
            <div className="mt-2 flex justify-between text-xl font-semibold">
              <span>Estimated price</span>
              <span className="text-[#f4c76b]">
                ₦{price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={loading || pickupLoading || dropoffLoading}
            className="lux-button-gold mt-2"
          >
            {loading ? "Placing order…" : "Confirm & book rider"}
          </button>
        </form>
      </div>
    </div>
  );
}
