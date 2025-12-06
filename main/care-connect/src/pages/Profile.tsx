import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export default function Profile() {
  const { user, deleteAccount, logout } = useAuth();
  const nav = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const title = user.displayName || user.email || "";
  const initials = title.trim().slice(0, 1).toUpperCase() || "U";

  const handleDelete = async () => {
    setError(null);
    const ok = window.confirm(
      "Delete your account permanently? This cannot be undone. You may be asked to log in again to confirm."
    );
    if (!ok) return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      nav("/", { replace: true });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "auth/requires-recent-login") {
        setError("Please log in again, then try deleting your account.");
      } else {
        setError(err?.message || "Failed to delete account. Try again later.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="card p-6 sm:p-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center font-semibold text-2xl">
          {initials}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{user.displayName || "Your profile"}</h1>
            <span className="badge bg-primary/10 text-primary capitalize">{user.role || "seeker"}</span>
          </div>
          <p className="text-gray-500">{user.email}</p>
          {user.ngo && <p className="text-sm text-emerald-600 font-medium">NGO verified • {user.ngo.orgName}</p>}
        </div>
        <button onClick={() => nav(-1)} className="btn w-full sm:w-auto">Back</button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Role</p>
          <p className="text-xl font-semibold capitalize">{user.role || "seeker"}</p>
          <p className="text-sm text-gray-500">Seekers can reserve medicines. NGO roles get 100% subsidy.</p>
        </div>
        <div className="card p-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Account status</p>
          <p className="text-xl font-semibold">Active</p>
          <p className="text-sm text-gray-500">Securely logged in on this device.</p>
        </div>
      </section>

      {user.ngo && (
        <section className="card p-6 space-y-4">
          <div className="section-heading">
            <h2>NGO details</h2>
            <p>We verified this information when approving your NGO access.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-gray-500">Organization</p>
              <p className="font-medium">{user.ngo.orgName}</p>
            </div>
            <div>
              <p className="text-gray-500">Registration number</p>
              <p className="font-medium">{user.ngo.regNo}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-gray-500">Address</p>
              <p className="font-medium">{user.ngo.address}</p>
            </div>
            {user.ngo.website && (
              <div>
                <p className="text-gray-500">Website</p>
                <a className="text-primary font-semibold" href={user.ngo.website} target="_blank" rel="noreferrer">{user.ngo.website}</a>
              </div>
            )}
            {user.ngo.contact && (
              <div>
                <p className="text-gray-500">Contact</p>
                <p className="font-medium">{user.ngo.contact}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {error && <div className="card border-red-200 bg-red-50 text-red-700 p-4 text-sm">{error}</div>}

      <section className="card p-6 space-y-4">
        <div className="section-heading">
          <h2>Account controls</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={async ()=>{ await logout(); nav("/", { replace: true }); }} className="btn btn-secondary flex-1">
            Logout
          </button>
          <button onClick={handleDelete} disabled={isDeleting} className="btn btn-danger flex-1">
            {isDeleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
        <p className="text-xs text-gray-500">Deleting your account removes donations and reservations tied to your ID.</p>
      </section>
    </div>
  );
}
