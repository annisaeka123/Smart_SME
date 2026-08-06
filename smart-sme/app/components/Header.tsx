"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Settings, Menu, Navigation, ArrowLeftRight } from "lucide-react";
import { useAppContext, Role } from "../context/AppContext";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { role, setRole } = useAppContext();
  const pathname = usePathname();

  const toggleRole = () => {
    if (role === "Owner") setRole("Kasir");
    else if (role === "Kasir") setRole("Staf");
    else setRole("Owner");
  };


  return (
    <header className="h-[76px] bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-6">
        <button className="md:hidden text-slate-500" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        

      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex relative w-64">
           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search..." 
             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-slate-800 placeholder:text-slate-400"
           />
        </div>

        <div className="flex items-center gap-4">
          <button className="text-slate-500 hover:text-slate-800 transition-colors relative">
            <Bell size={20} />
            <span className="absolute 1 top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="text-slate-500 hover:text-slate-800 transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

        <button 
          onClick={toggleRole}
          className="hidden md:flex items-center gap-2 group"
        >
          <span className="text-sm font-semibold text-slate-700">{role} Mode</span>
          <div className="flex items-center gap-1 text-violet-600 font-bold text-xs bg-violet-50 px-2 py-1.5 rounded-lg group-hover:bg-violet-100 transition-colors">
            Switch <ArrowLeftRight size={12} />
          </div>
        </button>
      </div>
    </header>
  );
}
