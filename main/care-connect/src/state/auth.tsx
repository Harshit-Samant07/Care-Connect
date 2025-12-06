/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Navigate, useLocation } from "react-router-dom";

type NGOInfo = {
  orgName: string;
  regNo: string;
  address: string;
  website?: string;
  contact?: string;
};

type CCUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  role?: "donor" | "ngo" | "seeker" | "admin";
  ngo?: NGOInfo;
};

type AuthCtx = {
  user: CCUser | null | undefined; // undefined = loading
  signup: (params: {
    email: string;
    password: string;
    name?: string;
    isNgo?: boolean;
    ngo?: NGOInfo;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CCUser | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { setUser(null); return; }

      // ensure profile doc exists
      const ref = doc(db, "users", fbUser.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: fbUser.displayName ?? "",
          name: fbUser.displayName ?? "",
          email: fbUser.email ?? "",
          role: "seeker",
          createdAt: serverTimestamp(),
        });
      }
      const data = snap.exists() ? snap.data() : undefined;
      // Auto-heal missing name/displayName/email on login
      const needName = !data?.name || String(data?.name).trim() === "";
      const needDisplay = !data?.displayName || String(data?.displayName).trim() === "";
      const needEmail = !data?.email || String(data?.email).trim() === "";
      if (snap.exists() && (needName || needDisplay || needEmail)) {
        await setDoc(ref, {
          ...(needName ? { name: fbUser.displayName ?? "" } : {}),
          ...(needDisplay ? { displayName: fbUser.displayName ?? "" } : {}),
          ...(needEmail ? { email: fbUser.email ?? "" } : {}),
        }, { merge: true });
      }
      const role = (data?.role ?? "seeker") as CCUser["role"];
      setUser({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        role,
        ngo: (data?.ngo as NGOInfo | undefined) ?? undefined,
      });
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user,
    async signup({ email, password, name, isNgo, ngo }) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // create/update user profile doc with role + NGO details (if provided)
      const ref = doc(db, "users", cred.user.uid);
      await setDoc(ref, {
        displayName: name ?? cred.user.displayName ?? "",
        name: name ?? cred.user.displayName ?? "",
        email: cred.user.email ?? email,
        role: isNgo ? "ngo" : "seeker",
        ngo: isNgo ? ngo : undefined,
        createdAt: serverTimestamp(),
      }, { merge: true });
    },
    async login(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async loginWithGoogle() {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    },
    async logout() { await signOut(auth); },
    async deleteAccount() {
      const current = auth.currentUser;
      if (!current) throw new Error("Not signed in");
      const uid = current.uid;
      // Try deleting auth user first (may require recent login)
      await deleteUser(current);
      // Best-effort delete of profile doc
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch {
        // ignore firestore cleanup errors
      }
      // onAuthStateChanged will set user to null afterward
    },
  }), [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}

// Protect pages that require login
export function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <div>Loading...</div>;
  if (user === null) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
}
