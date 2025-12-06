import { useEffect, useState } from "react";
import { fetchNearbyMedicines, type Medicine } from "../lib/geo";
import { useAuth } from "../state/auth";
import { Link } from "react-router-dom";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

type Coords = { lat: number; lng: number };

const FILTER_PRESETS = [
  "Pain killer",
  "Cough syrup",
  "Antibiotic",
  "Diabetes",
  "Cold & flu",
  "First aid",
];

const FILTER_KEYWORDS: Record<string, string[]> = {
  "Pain killer": ["pain", "paracetamol", "ibuprofen"],
  "Cough syrup": ["cough", "syrup"],
  Antibiotic: ["antibiotic", "amox", "cipro"],
  Diabetes: ["diabetes", "insulin", "metformin"],
  "Cold & flu": ["cold", "flu", "fever"],
  "First aid": ["bandage", "ointment"],
};

export default function Browse() {
  const { user } = useAuth();
  const [center, setCenter] = useState<Coords | null>(null);
  const [radiusKm, setRadiusKm] = useState(10); // default 10 km
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Medicine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const filteredItems = items.filter((m) => {
    const haystack = `${m.name} ${m.use}`.toLowerCase();
    const matchesSearch = searchTerm.trim() ? haystack.includes(searchTerm.toLowerCase()) : true;
    const matchesFilters = selectedFilters.length === 0 || selectedFilters.some((filter) => {
      const keywords = FILTER_KEYWORDS[filter] || [filter];
      return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });
    return matchesSearch && matchesFilters;
  });

  const quickRanges = [2, 5, 10, 20];

  // try to grab location on first load (can be blocked by browser)
  useEffect(() => {
    if (center) return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
        });
      },
      () => {} // ignore errors silently
    );
  }, [center]);

  async function load() {
    if (!center) {
      setError("Please set your location first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await fetchNearbyMedicines(center, radiusKm * 1000);
      setItems(data);
    } catch (error) {
      const err = error as Error;
      setError(err?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  async function reserve(m: Medicine) {
    if (!user) { setError("Login required to reserve."); return; }
    if (user.uid === m.ownerId) { setError("You cannot reserve your own donation."); return; }
    setError(null);
    try {
      // 1) mark medicine as reserved by this user
      await updateDoc(doc(db, "medicines", m.id), {
        status: "reserved",
        reservedBy: user.uid,
      });
      // 2) create a reservation record (best effort)
      await setDoc(doc(db, "reservations", `${m.id}_${user.uid}`), {
        medicineId: m.id,
        donorId: m.ownerId,
        takerId: user.uid,
        createdAt: serverTimestamp(),
      }, { merge: true });
      // remove from local list
      setItems(prev => prev.filter(x => x.id !== m.id));
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message || "Failed to reserve. Please try again.");
    }
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported in this browser.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCenter({
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
        }),
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const emptyState = (
    <div className="card p-12 text-center animate-fade-in">
      <div className="text-primary/50 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">No medicines match your filters</h3>
      <p className="text-gray-600">Try expanding the radius or removing a keyword to discover more donations.</p>
      <div className="mt-6 inline-flex gap-2 flex-wrap justify-center">
        {quickRanges.map((km) => (
          <button key={km} className="px-4 py-2 rounded-full border" onClick={() => setRadiusKm(km)}>
            Try {km} km
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d2671] via-[#5335cf] to-[#7b53ff] text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 45%)" }} />
        <div className="relative px-6 py-12 md:px-12">
          <p className="uppercase tracking-[0.3em] text-xs text-white/70">Care Connect</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-3 leading-tight">Find medicines donated by people around you.</h1>
          <p className="text-white/80 mt-3 max-w-2xl">– Share surplus medicines, or request what you need in seconds.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2">
              <span className="text-white text-lg font-semibold">{filteredItems.length.toString().padStart(2, "0")}</span>
              Medicines near you
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2">
              <span className="text-white text-lg font-semibold">{radiusKm} km</span>
              Active radius
            </span>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="card p-6 md:p-8 space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Search Input */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search medicines</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-gray-400 text-base">🔍</span>
                <input
                  type="text"
                  placeholder="Paracetamol, cough syrup, insulin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "3.5rem", paddingRight: "4.5rem" }}
                />
                {searchTerm && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded-full shadow-sm"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="text-gray-700 font-medium">Quick filter:</span>
                {FILTER_PRESETS.map((pill) => {
                  const active = selectedFilters.includes(pill);
                  return (
                    <button
                      key={pill}
                      className={`px-3 py-1 rounded-full border text-sm ${active ? "bg-primary text-white border-primary" : "border-gray-200"}`}
                      onClick={() => {
                        setSelectedFilters((prev) => {
                          const exists = prev.includes(pill);
                          const updated = exists ? prev.filter((f) => f !== pill) : [...prev, pill];
                          if (!exists && !searchTerm) setSearchTerm(pill);
                          return updated;
                        });
                      }}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>
              {selectedFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium">Active filters:</span>
                  {selectedFilters.map((filter) => (
                    <button
                      key={filter}
                      className="badge bg-gray-100 text-gray-700"
                      onClick={() => setSelectedFilters((prev) => prev.filter((f) => f !== filter))}
                    >
                      {filter} ✕
                    </button>
                  ))}
                  <button className="text-primary font-semibold" onClick={() => setSelectedFilters([])}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Location Card */}
          <div className="rounded-2xl border border-dashed p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Current location</p>
                <p className="font-semibold">{center ? `${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}` : "Not set"}</p>
              </div>
              <button onClick={useMyLocation} className="text-sm text-primary font-semibold">Use GPS</button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                step="0.000001"
                placeholder="Latitude"
                value={center?.lat ?? ""}
                onChange={(e) => setCenter((c) => ({ lat: parseFloat(e.target.value || "0"), lng: c?.lng ?? 0 }))}
                className="form-input"
              />
              <input
                type="number"
                step="0.000001"
                placeholder="Longitude"
                value={center?.lng ?? ""}
                onChange={(e) => setCenter((c) => ({ lat: c?.lat ?? 0, lng: parseFloat(e.target.value || "0") }))}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 w-full">
            <label className="text-sm font-medium text-gray-700">Search radius: {radiusKm} km</label>
            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(+e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2 flex-wrap text-xs">
              {quickRanges.map((range) => (
                <button
                  key={range}
                  className={`px-3 py-1 rounded-full border ${range === radiusKm ? "bg-primary text-white border-primary" : "border-gray-200"}`}
                  onClick={() => setRadiusKm(range)}
                >
                  {range} km
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={load}
            disabled={!center || loading}
            className="btn btn-primary w-full lg:w-auto lg:px-10"
          >
            {loading ? "Loading nearby donations" : "Search nearby"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {!loading && filteredItems.length === 0 ? (
        emptyState
      ) : (
        <div className="space-y-5 pt-2">
          {loading && (
            <div className="text-center text-sm text-gray-500">Hang tight, fetching donations near you...</div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((m) => (
              <div key={m.id} className="card group animate-slide-in overflow-hidden">
                <div className="relative h-48">
                  <img
                    src={m.photoUrl || "/placeholder-medicine.png"}
                    alt={m.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src="/placeholder-medicine.png"; }}
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                    {(m.distM! / 1000).toFixed(1)} km away
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{m.condition}</span>
                      <span>Expires {m.expiry.toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mt-1 group-hover:text-primary transition-colors">{m.name}</h3>
                    <p className="text-gray-600 line-clamp-2 text-sm mt-1">{m.use}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="text-lg font-semibold">₹{m.mrp}</div>
                      <div className="text-xs text-gray-500">MRP</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="text-lg font-semibold">{m.quantity}</div>
                      <div className="text-xs text-gray-500">Units</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-2">
                      <div className="text-lg font-semibold">{user?.role === "ngo" ? "Free" : `₹${m.priceForSeeker ?? Math.round(m.mrp * 0.3)}`}</div>
                      <div className="text-xs text-gray-500">For you</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      to={`/item/${m.id}`}
                      className="btn btn-primary flex-1"
                    >
                      View details
                    </Link>
                    <button
                      className="btn btn-secondary flex-1"
                      disabled={!user}
                      onClick={() => reserve(m)}
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
