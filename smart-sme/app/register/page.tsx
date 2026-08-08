"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Store, Mail, Lock, User, Briefcase, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleInput] = useState("Owner");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { session } = useAppContext();

  useEffect(() => {
    if (session) {
      const userRole = session.user.user_metadata?.role;
      if (userRole === "Owner") router.push("/dashboard");
      else if (userRole === "Kasir") router.push("/pos");
      else router.push("/reimburse");
    }
  }, [session, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Sanitize email to remove ANY invisible/unwanted characters
    const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '').trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: safeEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (error) {
        throw error;
      }

      // Automatically redirect logic
      if (role === "Owner") {
        router.push("/dashboard");
      } else if (role === "Kasir") {
        router.push("/pos");
      } else {
        router.push("/reimburse");
      }
    } catch (err: any) {
      setError(err.message || "Gagal mendaftar. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm border border-emerald-200">
              <Store size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Buat Akun</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Gabung dan mulai kelola bisnismu</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold p-3 rounded-xl mb-6 flex items-start gap-2 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Nama Lengkap</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900"
                  placeholder="Masukan Nama Lengkap Anda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900"
                  placeholder="Masukan Email Anda"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Tipe Akun (Role)</label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 appearance-none"
                  value={role}
                  onChange={(e) => setRoleInput(e.target.value)}
                >
                  <option value="Owner">Owner Bisnis</option>
                  <option value="Kasir">Kasir</option>
                  <option value="Staf">Staf</option>
                </select>
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900"
                  placeholder="Masukan 6 Digit Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 font-bold shadow-md shadow-emerald-600/20 transition-all flex justify-center items-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Daftar Akun"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm font-medium mt-6">
            Sudah ada akun?{" "}
            <Link href="/login" className="text-emerald-600 font-bold hover:text-emerald-700 underline underline-offset-4">
              Login disini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
