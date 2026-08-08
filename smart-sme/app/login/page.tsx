"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Store, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { session } = useAppContext();

  useEffect(() => {
    // If already logged in, redirect
    if (session) {
      const role = session.user.user_metadata?.role;
      if (role === "Owner") router.push("/dashboard");
      else if (role === "Kasir") router.push("/pos");
      else router.push("/reimburse");
    }
  }, [session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Sanitize email to remove ANY invisible/unwanted characters
    const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '').trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password,
      });

      if (error) {
        throw error;
      }

      const role = data.user?.user_metadata?.role;
      if (role === "Owner") {
        router.push("/dashboard");
      } else if (role === "Kasir") {
        router.push("/pos");
      } else {
        router.push("/reimburse");
      }
    } catch (err: any) {
      setError(err.message || "Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 mb-4 shadow-sm border border-violet-200">
              <Store size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Welcome Back</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Masuk ke dashboard Smart SME Anda</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold p-3 rounded-xl mb-6 flex items-start gap-2 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900"
                  placeholder="admin@smartsme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3.5 font-bold shadow-md shadow-violet-600/20 transition-all flex justify-center items-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Masuk Sekarang"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm font-medium mt-8">
            Belum punya akun?{" "}
            <Link href="/register" className="text-violet-600 font-bold hover:text-violet-700 underline underline-offset-4">
              Daftar disini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
