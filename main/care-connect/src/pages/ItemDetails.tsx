import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { useAuth } from "../state/auth";

type Medicine = {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  name: string;
  use: string;
  mrp: number;
  priceForSeeker?: number;
  expiry: any;
  quantity: number;
  condition: string;
  photoUrl?: string;
  location: { lat: number; lng: number };
  geohash: string;
  status: "available" | "reserved" | "handed_over" | "expired";
};

export default function ItemDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "medicines", id));
      if (snap.exists()) {
        const d: any = snap.data();
        setItem({ id: snap.id, ...d });
      }
      setLoading(false);
    })();
  }, [id]);

  async function reserve() {
    if (!user) { alert("Login first."); return; }
    if (!item || item.status !== "available") return;
    setReserving(true);
    try {
      await addDoc(collection(db, "reservations"), {
        medicineId: item.id,
        donorId: item.ownerId,
        takerId: user.uid,
        takerEmail: user.email ?? "",
        roleOfTaker: user.role ?? "seeker",
        priceForTaker: user.role === "ngo" ? 0 : Math.round((item.priceForSeeker ?? Math.round(item.mrp*0.3))),
        createdAt: serverTimestamp(),
        status: "active",
      });
      await updateDoc(doc(db, "medicines", item.id), {
        status: "reserved",
        reservedBy: user.uid,
        reservedAt: serverTimestamp(),
      });
      alert("Reserved! Contact donor to arrange pickup.");
      nav("/dashboard");
    } catch (e:any) {
      alert(e?.message || "Reservation failed");
    } finally {
      setReserving(false);
    }
  }

  if (loading) return <div className="text-center text-gray-500">Loading details…</div>;
  if (!item) return <div className="text-center text-gray-500">Not found</div>;

  const isAvailable = item.status === "available";
  const price = (user?.role === "ngo") ? 0 : (item.priceForSeeker ?? Math.round(item.mrp * 0.3));
  const exp = item.expiry?.toDate ? item.expiry.toDate() : new Date(item.expiry);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="card p-6 space-y-5">
          <div className="rounded-3xl overflow-hidden border border-gray-100 bg-slate-50">
            <img
              src={item.photoUrl || "/placeholder-medicine.png"}
              alt={item.name}
              className="w-full h-72 object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="uppercase text-xs tracking-[0.4em] text-gray-400">Medicine</p>
              <h1 className="text-3xl font-bold mt-2">{item.name}</h1>
            </div>
            <span
              className={`badge ml-auto ${isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
            >
              {isAvailable ? "Available" : item.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-gray-600 leading-relaxed">{item.use}</p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="metric-card">
              <p>MRP</p>
              <strong>₹{item.mrp}</strong>
            </div>
            <div className="metric-card">
              <p>Quantity</p>
              <strong>{item.quantity}</strong>
            </div>
            <div className="metric-card">
              <p>Expiry</p>
              <strong>{exp.toLocaleDateString()}</strong>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 border border-dashed border-gray-200 p-4 text-sm">
            <p className="font-semibold text-gray-800">Condition</p>
            <p className="text-gray-600 capitalize">{item.condition.replace("-", " ")}</p>
          </div>
        </section>

        <aside className="card p-6 space-y-5">
          <div>
            <p className="text-sm text-gray-500">Your contribution</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">₹{price}</p>
                <p className="text-xs text-gray-500">{user?.role === "ngo" ? "Subsidised for NGOs" : "30% of donor MRP"}</p>
              </div>
              {user?.role === "ngo" && (
                <span className="badge bg-emerald-100 text-emerald-700">NGO benefit</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Donor email</span>
              <a className="text-primary font-semibold" href={`mailto:${item.ownerEmail}`}>{item.ownerEmail || "—"}</a>
            </div>
            <p className="text-xs text-gray-400">Share polite pickup message after reserving.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={reserve}
              disabled={!isAvailable || !user || reserving}
              className="btn btn-primary w-full"
            >
              {isAvailable ? (reserving ? "Reserving…" : "Reserve medicine") : "Not available"}
            </button>
            <button onClick={() => nav(-1)} className="btn w-full">Back to results</button>
            {!user && <p className="text-center text-sm text-gray-500">Login to reserve this medicine.</p>}
          </div>

          <div className="rounded-2xl bg-slate-50/70 border border-dashed border-gray-300 p-4 text-xs text-gray-500">
            Check strip seal and expiry during handover. Care Connect only introduces donors and seekers.
          </div>
        </aside>
      </div>
    </div>
  );
}
