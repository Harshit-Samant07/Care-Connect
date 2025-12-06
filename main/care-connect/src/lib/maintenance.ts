import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  where,
  query,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Called at app start (or when admin visits /admin)
 * - marks expired medicines as "expired"
 * - releases reservations older than 24 h
 */
export async function runMaintenance() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1️⃣ Expire old medicines
  const medsSnap = await getDocs(collection(db, "medicines"));
  for (const m of medsSnap.docs) {
    const d: any = m.data();
    const expiry: Date =
      d.expiry instanceof Timestamp ? d.expiry.toDate() : new Date(d.expiry);
    if (expiry <= now && d.status !== "expired") {
      await updateDoc(doc(db, "medicines", m.id), { status: "expired" });
    }
  }

  // 2️⃣ Release stale reservations (>24 h)
  const resSnap = await getDocs(
    query(collection(db, "reservations"), where("status", "==", "active"))
  );
  for (const r of resSnap.docs) {
    const d: any = r.data();
    const created: Date =
      d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(d.createdAt);
    if (created < cutoff) {
      await updateDoc(doc(db, "reservations", r.id), { status: "expired" });
      if (d.medicineId) {
        await updateDoc(doc(db, "medicines", d.medicineId), { status: "available" });
      }
    }
  }

  console.log("✅ Maintenance completed");
}
