// src/pages/Admin.tsx
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { useAuth } from "../state/auth";
import { runMaintenance } from "../lib/maintenance";
type CCUser = {
  id: string;
  email?: string;
  displayName?: string;
  name?: string;
  role?: string;
  ngo?: { orgName?: string; regNo?: string; address?: string; website?: string; contact?: string };
};

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<CCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // NOTE: This reads all users; fine for a small project.
  useEffect(() => {
  if (user?.uid === "pAnsBC5scjfxZvUHFDpBmyfhopj2") {
    runMaintenance().catch(console.error);
  }
}, [user]);
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: CCUser[] = [];
      snap.forEach(d => {
        const data = d.data() as Partial<CCUser> & Record<string, unknown>;
        list.push({
          id: d.id,
          email: data.email as string | undefined,
          displayName: data.displayName as string | undefined,
          name: data.name as string | undefined,
          role: data.role as string | undefined,
          ngo: data.ngo as CCUser["ngo"] | undefined,
        });
      });
      setUsers(list);
      setLoading(false);
    })();
  }, []);

  async function makeNgo(uid: string) {
    await updateDoc(doc(db, "users", uid), { role: "ngo" });
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: "ngo" } : u));
  }

  async function unapproveNgo(uid: string) {
    await updateDoc(doc(db, "users", uid), { role: "seeker" });
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: "seeker" } : u));
  }


  if (!user) return <div>Login required</div>;
  // (Optional) you can also hide this page in UI unless current user.id === YOUR_ADMIN_UID

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="card p-6 lg:p-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="uppercase text-xs tracking-[0.4em] text-gray-400">Admin panel</p>
          <h1 className="text-3xl font-bold mt-2">Approve NGO partners</h1>
          <p className="text-gray-500 mt-2">Review pending NGO submissions, promote trusted users, or roll them back to seeker role.</p>
        </div>
        <div className="ml-auto flex flex-col gap-2 text-sm text-gray-500">
          <span>Total users: {users.length}</span>
          <span>NGO accounts: {users.filter(u => u.role === "ngo").length}</span>
        </div>
      </section>

      {loading ? (
        <div className="card p-6 text-center text-gray-500">Loading users…</div>
      ) : (
        <section className="card divide-y">
          {users.map(u => {
            const canExpand = Boolean(u.ngo);
            const isNgo = u.role === "ngo";
            const showApprove = !isNgo && !!u.ngo?.orgName;
            const name = (u.name && u.name.trim()) || (u.displayName && u.displayName.trim()) || (u.email ? u.email.split("@")[0] : "(No name)");
            return (
              <div key={u.id} className="p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {canExpand ? (
                    <button
                      className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100"
                      onClick={() => setExpanded((e) => ({ ...e, [u.id]: !e[u.id] }))}
                      aria-label={expanded[u.id] ? "Collapse" : "Expand"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${expanded[u.id] ? "rotate-90" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6l6 4-6 4V6z" clipRule="evenodd" />
                      </svg>
                    </button>
                  ) : (
                    <div className="h-9 w-9" />
                  )}
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium flex items-center gap-2">
                      <span>{name}</span>
                      {isNgo && u.ngo?.orgName && (
                        <span className="badge bg-emerald-100 text-emerald-700" title={`Reg No: ${u.ngo.regNo || 'N/A'}`}>{u.ngo.orgName}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                  <span className="badge bg-gray-100 capitalize">{u.role || "seeker"}</span>
                  {isNgo ? (
                    <button className="btn btn-secondary" onClick={() => unapproveNgo(u.id)}>Unapprove</button>
                  ) : showApprove ? (
                    <button className="btn btn-primary" onClick={() => makeNgo(u.id)}>Approve NGO</button>
                  ) : (
                    <span className="text-sm text-gray-400">No NGO info</span>
                  )}
                </div>
                {expanded[u.id] && u.ngo && (
                  <div className="mt-4 ml-9 rounded-2xl bg-slate-50/80 border border-dashed border-gray-200 p-4 text-sm grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-gray-500">Organization</p>
                      <p className="font-medium">{u.ngo.orgName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Reg No</p>
                      <p className="font-medium">{u.ngo.regNo || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-gray-500">Address</p>
                      <p className="font-medium">{u.ngo.address || "—"}</p>
                    </div>
                    {u.ngo.website && (
                      <div>
                        <p className="text-gray-500">Website</p>
                        <a href={u.ngo.website} className="text-primary font-medium" target="_blank" rel="noreferrer">{u.ngo.website}</a>
                      </div>
                    )}
                    {u.ngo.contact && (
                      <div>
                        <p className="text-gray-500">Contact</p>
                        <p className="font-medium">{u.ngo.contact}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!users.length && <div className="p-6 text-center text-gray-500">No users found.</div>}
        </section>
      )}
    </div>
  );
}
