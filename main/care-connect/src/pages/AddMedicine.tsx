import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../state/auth";
import LocationPicker from "../components/LocationPicker";
import { geohashForLocation } from "geofire-common";
import { seekerPrice } from "../lib/price";
import { useNavigate } from "react-router-dom";
import { uploadToCloudinary } from "../lib/cloudinary";


const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME as string | undefined;
const CLOUD_PRESET = import.meta.env.VITE_CLOUD_PRESET as string | undefined;

const schema = z.object({
  name: z.string().min(2, "Enter medicine name"),
  use: z.string().min(2, "Short description"),
  mrp: z.number().positive("Enter valid MRP"),
  expiry: z.string().refine((v)=>!Number.isNaN(Date.parse(v)), "Pick a date"),
  quantity: z.number().int().positive(),
  condition: z.enum(["sealed","unopened","strip-intact"]),
  // location handled separately
});

type FormValues = z.infer<typeof schema>;

export default function AddMedicine() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loc, setLoc] = useState<{lat:number; lng:number}>({ lat: 0, lng: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition: "sealed",
      quantity: 1,
    },
  });

  // Manage preview URL lifecycle
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!user) return <div>Login required.</div>;

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!user) { alert("Login required."); return; }
    if (!loc || !loc.lat || !loc.lng) {
      alert("Please set a valid location (lat/lng).");
      return;
    }
    if (new Date(values.expiry).getTime() <= Date.now()) {
      alert("Expiry must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      // Require image file and upload to Cloudinary
      if (!file) {
        alert("Please choose an image file.");
        setSubmitting(false);
        return;
      }
      if (!CLOUD_NAME || !CLOUD_PRESET) {
        alert("Image upload requires Cloudinary config. Please set VITE_CLOUD_NAME and VITE_CLOUD_PRESET.");
        setSubmitting(false);
        return;
      }
      const photoUrl = await uploadToCloudinary(file, CLOUD_NAME, CLOUD_PRESET);

      const geohash = geohashForLocation([loc.lat, loc.lng]);
      const priceForSeeker = seekerPrice(values.mrp);

      await addDoc(collection(db, "medicines"), {
        ownerId: user.uid,
        ownerEmail: user.email ?? "",
        name: values.name,
        use: values.use,
        mrp: values.mrp,
        priceForSeeker,
        expiry: new Date(values.expiry),
        quantity: values.quantity,
        condition: values.condition,
        photoUrl,
        location: { lat: loc.lat, lng: loc.lng },
        geohash,
        status: "available",
        createdAt: serverTimestamp(),
      });

      alert("Medicine listed!");
      nav("/dashboard");
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to save";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="card grid gap-8 lg:grid-cols-[1.2fr,0.8fr] p-6 lg:p-10">
        <div>
          <p className="uppercase text-xs tracking-[0.4em] text-gray-400">List a donation</p>
          <h1 className="text-3xl lg:text-4xl font-bold mt-3">Share unused medicine in under two minutes.</h1>
          <p className="text-gray-500 mt-4 leading-relaxed">Capture the pack photo, choose the pickup pin on campus, and we will auto-calc subsidised seeker price. Expired medicines are declined.</p>
        </div>
        <div className="rounded-2xl bg-slate-50/70 border border-dashed border-gray-300 p-5 space-y-3">
          <p className="font-semibold">Checklist before listing</p>
          <ul className="text-sm text-gray-500 space-y-2 list-disc pl-5">
            <li>Sealed packs with &gt; 30 days validity.</li>
            <li>Include dosage + quantity in description.</li>
            <li>Keep medicine handy for swift handover.</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="card p-6 space-y-6">
          <div className="section-heading">
            <h2>Listing details</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium">Medicine name</label>
              <input {...register("name")} className="mt-1 form-input" placeholder="Paracetamol 650" />
              {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Use / Description</label>
              <textarea {...register("use")} className="mt-1 form-input" rows={3} placeholder="Fever reducer · 2 unopened strips" />
              {errors.use && <p className="text-red-600 text-sm">{errors.use.message}</p>}
            </div>
          </div>
        </section>

        <section className="card p-6 space-y-6">
          <div className="section-heading">
            <h2>Condition & pricing</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">MRP (₹)</label>
              <input type="number" step="1" {...register("mrp", { valueAsNumber: true })} className="mt-1 form-input" />
              {errors.mrp && <p className="text-red-600 text-sm">{errors.mrp.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Seeker price (auto)</label>
              <div className="mt-1 h-11 rounded-xl bg-slate-50 flex items-center px-4 text-sm text-gray-500 border border-dashed border-gray-200">30% of MRP</div>
            </div>
            <div>
              <label className="block text-sm font-medium">Quantity</label>
              <input type="number" {...register("quantity", { valueAsNumber: true })} className="mt-1 form-input" />
              {errors.quantity && <p className="text-red-600 text-sm">{errors.quantity.message}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Expiry date</label>
              <input type="date" {...register("expiry")} className="mt-1 form-input" />
              {errors.expiry && <p className="text-red-600 text-sm">{errors.expiry.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Condition</label>
              <select {...register("condition")} className="mt-1 form-input">
                <option value="sealed">Sealed blister</option>
                <option value="unopened">Opened pack</option>
                <option value="strip-intact">Strip intact</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card p-6 space-y-6">
          <div className="section-heading">
            <h2>Photos</h2>
            <p>Upload at least one clear picture</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-primary transition">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e)=>setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <p className="font-semibold">Drop a file or click to upload</p>
              <p className="text-sm text-gray-500 mt-1">JPG/PNG/WebP · max 4MB</p>
              {file && <p className="text-xs text-primary mt-2">{file.name}</p>}
            </label>
            {previewUrl && (
              <div>
                <p className="text-sm font-medium">Preview</p>
                <div className="mt-2 overflow-hidden rounded-2xl border">
                  <img src={previewUrl} alt="Preview" className="w-full h-52 object-cover" />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <div className="section-heading">
            <h2>Pickup location</h2>
          </div>
          <LocationPicker value={loc} onChange={setLoc} />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button disabled={submitting || !file} className="btn btn-primary flex-1 sm:flex-initial">
            {submitting ? "Listing..." : "List medicine"}
          </button>
          <p className="text-xs text-gray-500">By listing you agree to responsibly handover medicine to seekers.</p>
        </div>
      </form>
    </div>
  );
}
