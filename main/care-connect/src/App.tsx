// src/App.tsx
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { useEffect, useState } from "react";
import { runMaintenance } from "./lib/maintenance";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./lib/firebase";

const ADMIN_UID = "pAnsBC5scjfxZvUHFDpBmyfhopj2"; // optional; leave as is for now

export default function App() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [heroStats, setHeroStats] = useState({
    donations: 0,
    ngos: 0,
  });

  useEffect(() => {
    let timer: number | undefined;
    (async () => {
      try { await runMaintenance(); } catch {}
    })();
    // Run maintenance periodically (every 1 hour)
    timer = window.setInterval(() => {
      runMaintenance().catch(() => {});
    }, 60 * 60 * 1000);
    return () => { if (timer) window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const medsUnsub = onSnapshot(collection(db, "medicines"), (snapshot) => {
      setHeroStats((prev) => ({
        ...prev,
        donations: snapshot.size,
      }));
    }, (err) => console.error("Hero stats medicines listener failed", err));

    const ngoUnsub = onSnapshot(query(collection(db, "users"), where("role", "==", "ngo")), (snapshot) => {
      setHeroStats((prev) => ({
        ...prev,
        ngos: snapshot.size,
      }));
    }, (err) => console.error("Hero stats NGO listener failed", err));

    return () => {
      medsUnsub();
      ngoUnsub();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,33,182,0.08),_transparent_45%),_#f4f6fb]">
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-[#312e81] via-[#5b21b6] to-[#9333ea] text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255,255,255,.6), transparent 50%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center gap-4">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">Care Connect</h1>
            </div>
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-sm font-medium">
            <Link to="/" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition">Browse</Link>
            {user && <Link to="/add-medicine" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition">Donate</Link>}
            {user && <Link to="/dashboard" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition">Dashboard</Link>}
            {user?.uid === ADMIN_UID && <Link to="/admin" className="px-3 py-1.5 rounded-full hover:bg-white/10 transition">Admin</Link>}
          </nav>
          <div className="flex items-center gap-3">
            {!user ? (
              <Link to="/login" className="btn btn-primary bg-white text-[#5b21b6] hover:bg-white/90">Login</Link>
            ) : (
              <>
                <Link to="/profile" className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-semibold">
                    {(user.displayName || user.email || "U").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm">Profile</span>
                </Link>
                <button
                  onClick={async () => { await logout(); nav("/"); }}
                  className="btn btn-secondary border-white/40 text-white"
                >Logout</button>
              </>
            )}
          </div>
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-white/80 mt-4">
            {[
              {
                label: "Donations",
                value: heroStats.donations.toString().padStart(2, "0"),
                styles: "from-orange-400/80 via-rose-500/70 to-red-600/70 border-orange-200/60",
              },
              {
                label: "Verified NGOs",
                value: heroStats.ngos.toString().padStart(2, "0"),
                styles: "from-cyan-400/80 via-blue-500/70 to-purple-600/70 border-cyan-200/60",
              },
            ].map(({ label, value, styles }) => (
              <div key={label} className={`rounded-2xl border px-4 py-3 backdrop-blur metric-card text-gray-800 bg-gradient-to-br ${styles}`}>
                <div className="text-2xl font-semibold text-gray-700">{value}</div>
                <div className="text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10 space-y-10">
        <Outlet />
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-sm text-gray-500 flex flex-col gap-2">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>© {new Date().getFullYear()} Care Connect</span>
        </div>
      </footer>
    </div>
  );
}
