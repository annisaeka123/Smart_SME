"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Store, LayoutDashboard, BarChart2, Users, Receipt, FolderKanban, Plus, FileText, Settings, LogOut, Package, Wallet } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../../lib/supabase";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pos", label: "POS Kasir", icon: Receipt },
  { href: "/products", label: "Daftar Produk", icon: BarChart2 },
  { href: "/inventory", label: "Bahan Baku", icon: Package },
  { href: "/reimburse", label: "Reimbursements", icon: FolderKanban },
  { href: "/transactions", label: "Transaksi & Kas", icon: Wallet },
];

const bottomLinks = [
  { href: "#", label: "Documentation", icon: FileText, action: null },
  { href: "#", label: "Settings", icon: Settings, action: null },
  { href: "#", label: "Logout", icon: LogOut, isDanger: true, action: "LOGOUT" },
];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, session } = useAppContext();

  useEffect(() => {
    if (pathname === "/") {
      if (role === "Owner") router.replace("/dashboard");
      else if (role === "Kasir") router.replace("/pos");
      else if (role === "Staf") router.replace("/reimburse");
    }
  }, [role, pathname, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filteredLinks = links.filter((link) => {
    if (role === "Owner") return true; 

    if (role === "Kasir") {
      return link.href === "/pos";
    }

    if (role === "Staf") {
      return link.href === "/reimburse";
    }

    return false;
  });

  const userName = session?.user?.user_metadata?.full_name || "User";
  const userInitials = userName.substring(0, 2).toUpperCase();

  return (
    <div className={`fixed inset-y-0 left-0 bg-white border-r border-slate-100 w-64 flex flex-col transform transition-transform duration-300 z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Store className="text-violet-600" size={28} />
          <h1 className="text-xl font-bold text-violet-600 leading-tight">Smart SME</h1>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
          <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
            {userInitials}
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">{userName}</h3>
            <p className="text-xs font-semibold text-violet-600 mt-0.5">{role}</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (pathname === '/' && link.href==='/dashboard');
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
                isActive 
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-1">        
        {bottomLinks.map((link) => {
          const Icon = link.icon;
          
          if (link.action === "LOGOUT") {
            return (
              <button
                key={link.label}
                onClick={handleLogout}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${
                  link.isDanger ? "text-rose-500 hover:bg-rose-50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon size={18} />
                {link.label}
              </button>
            );
          }

          return (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${
                link.isDanger ? "text-rose-500 hover:bg-rose-50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
