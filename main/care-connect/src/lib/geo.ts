// src/lib/geo.ts
import {
  geohashQueryBounds,
  distanceBetween,
} from "geofire-common";
import {
  collection,
  getDocs,
  orderBy,
  query,
  startAt,
  endAt,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type Medicine = {
  id: string;
  ownerId: string;
  name: string;
  use: string;
  mrp: number;
  priceForSeeker?: number;
  expiry: Date;
  quantity: number;
  condition: string;
  photoUrl?: string;
  location: { lat: number; lng: number };
  geohash: string;
  status: "available" | "reserved" | "handed_over" | "expired";
  distM?: number;
};

export async function fetchNearbyMedicines(
  center: { lat: number; lng: number },
  radiusM = 10000
): Promise<Medicine[]> {
  const bounds = geohashQueryBounds([center.lat, center.lng], radiusM);
  const snaps = await Promise.all(
    bounds.map((b) =>
      getDocs(
        query(
          collection(db, "medicines"),
          orderBy("geohash"),
          startAt(b[0]),
          endAt(b[1])
        )
      )
    )
  );

  const out: Medicine[] = [];
  for (const snap of snaps) {
    snap.forEach((doc) => {
      const d = doc.data() as any;
      if (!d.location) return;

      const expiry: Date =
        d.expiry instanceof Timestamp ? d.expiry.toDate() : new Date(d.expiry);
      const distM =
        distanceBetween(
          [center.lat, center.lng],
          [d.location.lat, d.location.lng]
        ) * 1000;

      if (
        distM <= radiusM &&
        d.status === "available" &&
        expiry.getTime() > Date.now()
      ) {
        out.push({
          id: doc.id,
          ownerId: d.ownerId,
          name: d.name,
          use: d.use,
          mrp: d.mrp,
          priceForSeeker: d.priceForSeeker,
          expiry,
          quantity: d.quantity,
          condition: d.condition,
          photoUrl: d.photoUrl,
          location: d.location,
          geohash: d.geohash,
          status: d.status,
          distM,
        });
      }
    });
  }

  const unique = new Map<string, Medicine>();
  for (const m of out) unique.set(m.id, m);
  return Array.from(unique.values()).sort((a, b) => (a.distM! - b.distM!));
}
