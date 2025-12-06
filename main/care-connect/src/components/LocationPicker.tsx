import { useState } from "react";

type Props = {
  value?: { lat: number; lng: number };
  onChange: (loc: { lat: number; lng: number }) => void;
};

export default function LocationPicker({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const loc = value ?? { lat: 0, lng: 0 };

  async function getCurrent() {
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = +pos.coords.latitude.toFixed(6);
            const lng = +pos.coords.longitude.toFixed(6);
            onChange({ lat, lng });
            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    } catch {
      alert("Could not get location. You can enter it manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={loc.lat}
            onChange={(e)=>onChange({ lat: parseFloat(e.target.value||"0"), lng: loc.lng })}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={loc.lng}
            onChange={(e)=>onChange({ lat: loc.lat, lng: parseFloat(e.target.value||"0") })}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={getCurrent}
        disabled={loading}
        className="px-3 py-2 rounded border"
      >
        {loading ? "Getting location..." : "Use my current location"}
      </button>
      <p className="text-xs text-gray-600">Tip: pin your exact pickup point for better matching.</p>
    </div>
  );
}
