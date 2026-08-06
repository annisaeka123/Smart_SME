"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Store, LayoutDashboard, BarChart2, Users, Receipt, FolderKanban, Plus, FileText, Settings, LogOut } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pos", label: "POS Kasir", icon: Receipt },
  { href: "/products", label: "Master Produk", icon: BarChart2 },
  { href: "/reimburse", label: "Reimbursements", icon: FolderKanban },
];

const bottomLinks = [
  { href: "#", label: "Documentation", icon: FileText },
  { href: "#", label: "Settings", icon: Settings },
  { href: "#", label: "Logout", icon: LogOut, isDanger: true },
];

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAppContext();

  useEffect(() => {
    if (pathname === "/") {
      if (role === "Owner") router.replace("/dashboard");
      else if (role === "Kasir") router.replace("/pos");
      else if (role === "Staf") router.replace("/reimburse");
    }
  }, [role, pathname, router]);

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
            JD
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800 leading-tight">Jordan Diaz</h3>
            <p className="text-xs text-slate-500">{role} Mode</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
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
        <button className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mb-4 shadow-md shadow-violet-600/20 transition-all text-sm">
          <Plus size={18} />
          Add New Entry
        </button>
        
        {bottomLinks.map((link) => {
          const Icon = link.icon;
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
