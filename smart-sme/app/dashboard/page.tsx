"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { TrendingUp, TrendingDown, Banknote, Landmark, Receipt, Wallet, Search, Plus, MoreVertical } from "lucide-react";

export default function Dashboard() {
  const { totalOmzet, totalProfit, totalPengeluaran, netProfit, products, role } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role !== "Owner") {
      if (role === "Kasir") router.push("/pos");
      if (role === "Staf") router.push("/reimburse");
    }
  }, [role, router]);

  const [searchQuery, setSearchQuery] = useState("");

  if (role !== "Owner") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Welcome back, Jordan. Here's what's happening across your workspace.</p>
        </div>
        <button className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm text-sm hover:bg-slate-50 transition-colors">
          This Month ▾
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Omzet */}
        <div className="bg-[#ECFDF5] p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-emerald-600 font-bold backdrop-blur-sm">
              <Banknote size={20} />
            </div>
            <div className="flex items-center text-sm font-bold text-emerald-600 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <TrendingUp size={14} className="mr-1" />
              +12.4%
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-emerald-950">{formatCurrency(totalOmzet)}</h3>
            <p className="text-sm font-semibold text-emerald-700/80 mt-1">Total Omzet</p>
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-[#F0F9FF] p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-blue-600 font-bold backdrop-blur-sm">
              <Landmark size={20} />
            </div>
            <div className="flex items-center text-sm font-bold text-blue-600 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <TrendingUp size={14} className="mr-1" />
              +5.1%
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-blue-950">{formatCurrency(totalProfit)}</h3>
            <p className="text-sm font-semibold text-blue-700/80 mt-1">Total Profit POS</p>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-[#FFF1F2] p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-rose-600 font-bold backdrop-blur-sm">
              <Receipt size={20} />
            </div>
            <div className="flex items-center text-sm font-bold text-rose-600 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <TrendingDown size={14} className="mr-1" />
              -2.3%
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-rose-950">{formatCurrency(totalPengeluaran)}</h3>
            <p className="text-sm font-semibold text-rose-700/80 mt-1">Pengeluaran Approved</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-[#FAF5FF] p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-violet-600 font-bold backdrop-blur-sm">
              <Wallet size={20} />
            </div>
            <div className="flex items-center text-sm font-bold text-violet-600 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <TrendingUp size={14} className="mr-1" />
              +8.6%
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-violet-950">{formatCurrency(netProfit)}</h3>
            <p className="text-sm font-semibold text-violet-700/80 mt-1">Net Profit</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col pt-6 mt-8">
        <div className="px-8 pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Master Produk</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage your inventory and pricing</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-64 text-slate-800"
                />
             </div>
             <button onClick={() => router.push('/products')} className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-violet-600/20 text-sm whitespace-nowrap">
               <Plus size={18} />
               Tambah Produk
             </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="py-4 px-8 text-xs font-semibold text-slate-500">Nama Produk</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500">HPP</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500">Harga Jual</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500">Margin</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500">Stok</th>
                <th className="py-4 px-8 text-xs font-semibold text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p) => {
                const pMarginRp = p.price - p.hpp;
                const pMarginPct = p.hpp > 0 ? (pMarginRp / p.hpp) * 100 : 0;
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shadow-sm">
                           {p.icon === "Coffee" ? <span className="font-bold text-sm">☕</span> : <span className="font-bold text-sm">🍰</span>}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-600 text-sm">{formatCurrency(p.hpp)}</td>
                    <td className="py-4 px-6 font-bold text-slate-800 text-sm">{formatCurrency(p.price)}</td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-emerald-500 text-sm">{pMarginPct.toFixed(0)}%</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-bold text-sm ${p.stock < 10 ? 'text-rose-500' : 'text-slate-600'}`}>{p.stock} units</span>
                    </td>
                    <td className="py-4 px-8 text-right">
                      <button className="text-slate-400 hover:text-slate-700 transition-colors p-2">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-white text-sm">
            <span className="text-slate-500 font-medium">Showing 1 to {filteredProducts.length} entries</span>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 text-xs font-bold hover:bg-slate-50">&lt;</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-600 text-white shadow-md text-xs font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
