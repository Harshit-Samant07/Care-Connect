import { collection, getDocs, query, where, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { useAuth } from "../state/auth";
import { Link } from "react-router-dom";

type Medicine = {
  id: string;
  name: string;
  status: "available" | "reserved" | "handed_over" | string;
  photoUrl?: string;
  quantity: number;
  mrp: number;
  reservedBy?: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [takers, setTakers] = useState<Record<string, { displayName?: string; email?: string }>>({});
  const [myReserved, setMyReserved] = useState<Medicine[]>([]);
  const [resTimes, setResTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const qy = query(collection(db, "medicines"), where("ownerId", "==", user.uid));
      const snap = await getDocs(qy);
      const out: Medicine[] = [];
      snap.forEach(d => {
        const data = d.data() as Partial<Medicine> & Record<string, unknown>;
        out.push({
          id: d.id,
          name: (data.name as string) || "(unknown)",
            status: (data.status as Medicine["status"]) || "available",
          photoUrl: data.photoUrl as string | undefined,
          quantity: (data.quantity as number) || 0,
          mrp: (data.mrp as number) || 0,
          reservedBy: data.reservedBy as string | undefined,
        });
      });
      setItems(out);
      // fetch taker info for reserved items (best-effort)
  const uids = Array.from(new Set(out.map(m => m.reservedBy).filter((x): x is string => Boolean(x))));
      const map: Record<string, { displayName?: string; email?: string }> = {};
      for (const uid of uids) {
        try {
          const uref = doc(db, "users", uid);
          const usnap = await getDoc(uref);
          if (usnap.exists()) {
            const d = usnap.data() as { displayName?: string; email?: string };
            map[uid] = { displayName: d.displayName, email: d.email };
          }
        } catch {
          // ignore fetch error for taker info
        }
      }
      setTakers(map);
      setLoading(false);
    })();
  }, [user]);

  // Load my reservations (where I am the taker)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const qy = query(collection(db, "medicines"), where("reservedBy", "==", user.uid));
      const snap = await getDocs(qy);
      const out: Medicine[] = [];
      const timeMap: Record<string, string> = {};
      for (const d of snap.docs) {
        const data = d.data() as Partial<Medicine> & Record<string, unknown>;
        const med: Medicine = {
          id: d.id,
          name: (data.name as string) || "(unknown)",
          status: (data.status as Medicine["status"]) || "reserved",
          photoUrl: data.photoUrl as string | undefined,
          quantity: (data.quantity as number) || 0,
          mrp: (data.mrp as number) || 0,
          reservedBy: data.reservedBy as string | undefined,
        };
        out.push(med);
        // fetch reservation timestamp
        try {
          const rs = await getDoc(doc(db, "reservations", `${d.id}_${user.uid}`));
          if (rs.exists()) {
            const rdata = rs.data() as { createdAt?: { toDate?: () => Date } };
            const when = rdata.createdAt?.toDate ? rdata.createdAt.toDate().toLocaleString() : undefined;
            if (when) timeMap[d.id] = when;
          }
        } catch {
          // ignore
        }
      }
      setMyReserved(out);
      setResTimes(prev => ({ ...prev, ...timeMap }));
    })();
  }, [user]);

  async function markHandedOver(id: string) {
    await updateDoc(doc(db, "medicines", id), {
      status: "handed_over",
      reservedBy: null,
      handedOverAt: serverTimestamp(),
    });
    setItems(prev => prev.map(x => x.id === id ? { ...x, status: "handed_over" } : x));
  }

  async function cancelReservation(id: string) {
    const ok = window.confirm("Cancel this reservation? The medicine will become available for others to reserve.");
    if (!ok) return;
    await updateDoc(doc(db, "medicines", id), { status: "available", reservedBy: null });
    setMyReserved(prev => prev.filter(x => x.id !== id));
  }

  if (!user) return <div>Login required.</div>;
  if (loading) return <div>Loading...</div>;

  const reserved = items.filter(i => i.status === "reserved");
  const available = items.filter(i => i.status === "available");
  const completed = items.filter(i => i.status === "handed_over");

  const Card = ({ m }: { m: Medicine }) => (
    <div className="bg-white p-4 rounded-xl shadow flex gap-4">
      <img src={m.photoUrl || "/placeholder-medicine.png"} className="w-24 h-24 object-cover rounded border" />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold">{m.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 capitalize">{m.status.replace("_"," ")}</span>
        </div>
        <p className="text-sm">Qty: {m.quantity} • MRP: ₹{m.mrp}</p>
        {m.status === "reserved" && (
          <p className="text-sm mt-1 text-gray-700">
            Reserved by: {takers[m.reservedBy as string]?.displayName || takers[m.reservedBy as string]?.email || m.reservedBy}
            {resTimes[m.id] && <span className="text-gray-500"> • Reserved on {resTimes[m.id]}</span>}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <Link to={`/item/${m.id}`} className="px-3 py-1.5 rounded border">View</Link>
          <button
            className="px-3 py-1.5 rounded border"
            disabled={m.status === "handed_over"}
            onClick={() => markHandedOver(m.id)}
          >
            {m.status === "handed_over" ? "Completed" : "Mark handed over"}
          </button>
        </div>
      </div>
    </div>
  );

  const statBlocks = [
    { label: "Total donations", value: items.length.toString().padStart(2, "0") },
    { label: "Reserved", value: reserved.length.toString().padStart(2, "0") },
    { label: "Available", value: available.length.toString().padStart(2, "0") },
    { label: "Completed", value: completed.length.toString().padStart(2, "0") },
  ];

  return (
    <div className="space-y-8">
      <div className="section-heading">My medicine hub</div>
      <div className="grid gap-4 md:grid-cols-4">
        {statBlocks.map((stat) => (
          <div key={stat.label} className="metric-card">
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {myReserved.length > 0 && (
        <section className="space-y-4">
          <div className="section-heading">My reservations</div>
          <div className="grid md:grid-cols-2 gap-4">
            {myReserved.map(m => (
              <div key={m.id} className="card p-4 flex gap-4">
                <img src={m.photoUrl || "/placeholder-medicine.png"} className="w-28 h-28 object-cover rounded-2xl border" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{m.name}</h3>
                    <span className="badge bg-yellow-100 text-yellow-800">Reserved</span>
                  </div>
                  <p className="text-sm text-gray-600">Qty {m.quantity} • ₹{m.mrp}</p>
                  {resTimes[m.id] && (
                    <p className="text-xs text-gray-500 mt-1">Reserved on {resTimes[m.id]}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Link to={`/item/${m.id}`} className="btn btn-secondary flex-1">View</Link>
                    <button className="btn btn-primary flex-1" onClick={() => cancelReservation(m.id)}>
                      Cancel reservation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {reserved.length > 0 && (
        <section className="space-y-4">
          <div className="section-heading">Reserved by seekers</div>
          <div className="grid md:grid-cols-2 gap-4">
            {reserved.map(m => <Card key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section className="space-y-4">
          <div className="section-heading">Available donations</div>
          <div className="grid md:grid-cols-2 gap-4">
            {available.map(m => <Card key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-4">
          <div className="section-heading">Completed handovers</div>
          <div className="grid md:grid-cols-2 gap-4">
            {completed.map(m => <Card key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <div className="card p-6 text-center text-gray-600">
          <p>No donations yet. <Link className="text-primary font-semibold" to="/add-medicine">Add one now →</Link></p>
        </div>
      )}
    </div>
  );
}
