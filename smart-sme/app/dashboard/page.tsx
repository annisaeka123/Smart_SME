"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { TrendingUp, TrendingDown, Banknote, Landmark, Receipt, Wallet, AlertTriangle, ChevronRight, BarChart3, Package, ShoppingCart, Loader2, CheckCircle, X, CreditCard, PieChart, ShoppingBag } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type DateFilterType = "today" | "7d" | "this_month";

export default function Dashboard() {
  const { role } = useAppContext();
  const router = useRouter();

  const [dateFilter, setDateFilter] = useState<DateFilterType>("7d");
  
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [pendingExpenses, setPendingExpenses] = useState(0);

  const [pemasukanChange, setPemasukanChange] = useState<number | null>(null);
  const [transactionChange, setTransactionChange] = useState<number | null>(null);
  const [pengeluaranChange, setPengeluaranChange] = useState<number | null>(null);
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<Record<string, number>>({});

  // Expense modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    category: "Operational",
    notes: ""
  });

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0 && current > 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const fetchDashboardData = async () => {
    const now = new Date();
    const currentEnd = new Date(now);
    let currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);

    let previousStart = new Date();
    let previousEnd = new Date();

    if (dateFilter === "7d") {
      currentStart.setDate(currentStart.getDate() - 6);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 7);
    } else if (dateFilter === "this_month") {
      currentStart.setDate(1);
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
      previousEnd = new Date(now);
      previousEnd.setMonth(previousEnd.getMonth() - 1);
    } else {
      previousEnd = new Date(currentStart);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
    }

    const currentStartIso = currentStart.toISOString();
    const currentEndIso = currentEnd.toISOString();
    const previousStartIso = previousStart.toISOString();
    const previousEndIso = previousEnd.toISOString();

    const [txRes, expRes, pendingRes, prevTxRes, prevExpRes] = await Promise.all([
      supabase.from("transactions").select("*").gte("created_at", currentStartIso).lte("created_at", currentEndIso).order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("status", "approved").gte("created_at", currentStartIso).lte("created_at", currentEndIso),
      supabase.from("expenses").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("transactions").select("total_price, created_at").gte("created_at", previousStartIso).lt("created_at", previousEndIso),
      supabase.from("expenses").select("amount, created_at").eq("status", "approved").gte("created_at", previousStartIso).lt("created_at", previousEndIso)
    ]);

    const txData = txRes.data || [];
    const expData = expRes.data || [];
    const prevTxData = prevTxRes.data || [];
    const prevExpData = prevExpRes.data || [];
    
    setTotalTransactions(txData.length);
    setPendingExpenses(pendingRes.count || 0);

    const pemasukan = txData.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const pengeluaran = expData.reduce((sum, item) => sum + (item.amount || 0), 0);
    const prevPemasukan = prevTxData.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const prevPengeluaran = prevExpData.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    setTotalPemasukan(pemasukan);
    setTotalPengeluaran(pengeluaran);
    
    const pChange = calculatePercentageChange(pemasukan, prevPemasukan);
    const tChange = calculatePercentageChange(txData.length, prevTxData.length);
    const eChange = calculatePercentageChange(pengeluaran, prevPengeluaran);
    
    setPemasukanChange(pChange);
    setTransactionChange(tChange);
    setPengeluaranChange(eChange);
    
    console.log("=== DASHBOARD ANALYTICS DEBUG ===");
    console.log("Date Filter:", dateFilter);
    console.log("Current Period:", { start: currentStartIso, end: currentEndIso });
    console.log("Previous Period:", { start: previousStartIso, end: previousEndIso });
    console.log("Current Transactions:", { count: txData.length, total: pemasukan });
    console.log("Previous Transactions:", { count: prevTxData.length, total: prevPemasukan });
    console.log("Current Pemasukan:", pemasukan);
    console.log("Previous Pemasukan:", prevPemasukan);
    console.log("Current Pengeluaran:", pengeluaran);
    console.log("Previous Pengeluaran:", prevPengeluaran);
    console.log("Percentage:", { pemasukanChange: pChange, transactionChange: tChange, pengeluaranChange: eChange });
    
    setRecentTransactions(txData.slice(0, 5));

    // Expense Breakdown
    const breakdown: Record<string, number> = {};
    expData.forEach((ex) => {
      let cat = ex.category || "Lainnya";
      if (cat.toLowerCase().includes("inventory") || cat.toLowerCase().includes("bahan")) {
        cat = "Bahan Baku";
      } else if (cat.toLowerCase().includes("operation") || cat.toLowerCase().includes("operasional")) {
        cat = "Operasional";
      } else if (cat.toLowerCase().includes("maintain") || cat.toLowerCase().includes("maintenance")) {
        cat = "Maintenance";
      }
      if (!breakdown[cat]) breakdown[cat] = 0;
      breakdown[cat] += (ex.amount || 0);
    });
    setExpenseBreakdown(breakdown);

    // Top Products Calculation
    const productCount: Record<string, number> = {};
    txData.forEach((tx) => {
      let items = [];
      if (typeof tx.items === "string") {
        try { items = JSON.parse(tx.items); } catch(e) {}
      } else if (Array.isArray(tx.items)) {
        items = tx.items;
      }
      
      items.forEach((item: any) => {
        if (item.name) {
          productCount[item.name] = (productCount[item.name] || 0) + (item.qty || 1);
        }
      });
    });
    
    const sortedProducts = Object.keys(productCount)
      .map(k => ({ name: k, qty: productCount[k] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
      
    setTopProducts(sortedProducts);
    
    const chartMap: Record<string, { date: string, pemasukan: number, pengeluaran: number }> = {};
    
    let curr = new Date(currentStart);
    while (curr <= currentEnd) {
      const dStr = curr.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      chartMap[dStr] = { date: dStr, pemasukan: 0, pengeluaran: 0 };
      curr.setDate(curr.getDate() + 1);
    }
    
    txData.forEach(tx => {
      const dStr = new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (chartMap[dStr]) chartMap[dStr].pemasukan += (tx.total_price || 0);
    });
    
    expData.forEach(ex => {
      const dStr = new Date(ex.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (chartMap[dStr]) chartMap[dStr].pengeluaran += (ex.amount || 0);
    });
    
    const finalChartData = Object.values(chartMap);
    setChartData(finalChartData);
  };

  useEffect(() => {
    if (role !== "Owner") {
      if (role === "Kasir") router.push("/pos");
      if (role === "Staf") router.push("/reimburse");
      return;
    }
    
    fetchDashboardData();
    
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchDashboardData();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, router, dateFilter]);

  const submitExpense = async () => {
    if (!formData.title || formData.amount <= 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        notes: formData.notes,
        status: 'approved',
        type: 'owner_expense'
      };
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw new Error("Gagal menyimpan data: " + error.message);
      
      setShowExpenseModal(false);
      setFormData({ title: "", amount: 0, category: "Operational", notes: "" });
      // Realtime listener will automatically pick this up and refresh data
    } catch (e: any) {
      alert(e.message);
    }
    setIsSubmitting(false);
  };

  if (role !== "Owner") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const labaBersih = totalPemasukan - totalPengeluaran;
  const profitMargin = totalPemasukan > 0 ? (labaBersih / totalPemasukan) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {pendingExpenses > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
               <AlertTriangle size={20} />
             </div>
             <p className="text-amber-800 font-semibold text-sm">
               ⚠️ Ada <span className="font-bold text-amber-900">{pendingExpenses}</span> pengajuan reimbursement dari staf yang membutuhkan persetujuan Anda.
             </p>
           </div>
           <button onClick={() => router.push('/reimburse')} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center whitespace-nowrap">
             Proses di Reimburse <ChevronRight size={16} className="ml-1" />
           </button>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Pantau performa bisnis dan keuangan terkini.</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="bg-slate-100 p-1 flex rounded-xl border border-slate-200 w-fit">
             <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${dateFilter === 'today' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
               Hari Ini
             </button>
             <button onClick={() => setDateFilter('7d')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${dateFilter === '7d' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
               7 Hari Terakhir
             </button>
             <button onClick={() => setDateFilter('this_month')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${dateFilter === 'this_month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
               Bulan Ini
             </button>
          </div>


        </div>
      </div>

      {/* AI INSIGHT BANNER */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm animate-in fade-in">
        <div className="bg-white p-2.5 rounded-xl shadow-[0_2px_10px_rgba(79,70,229,0.1)] text-indigo-600 shrink-0">
           <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div>
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-0.5">🤖 Ringkasan & Saran AI</h4>
          <p className="text-sm font-medium text-indigo-700 leading-relaxed">
            {topProducts.length > 0 
              ? `Penjualan tertinggi dipegang oleh ${topProducts[0]?.name || 'produk'}. Kinerja keuangan toko Anda berada dalam kondisi ${profitMargin > 20 ? 'sangat sehat' : profitMargin > 10 ? 'cukup sehat' : profitMargin >= 0 ? 'perlu diwaspadai' : 'merugi'}.`
              : `Belum ada data penjualan yang cukup. Arus kas saat ini berstatus ${profitMargin >= 0 ? 'aman' : 'merugi'}.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Pemasukan */}
        <div className="bg-[#ECFDF5] p-5 rounded-3xl shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-start justify-end mb-4 relative z-10 w-full">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold backdrop-blur-sm shadow-sm ring-1 ring-green-100">
              <Wallet size={20} />
            </div>
          </div>
          <div className="relative z-10 w-full mt-auto">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-emerald-950">{formatCurrency(totalPemasukan)}</h3>
            <p className="text-sm font-semibold text-emerald-700/80 mt-1">Total akumulasi pemasukan</p>
          </div>
        </div>

        {/* Card 2: Pengeluaran */}
        <div className="bg-[#FFF1F2] p-5 rounded-3xl shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-start justify-end mb-4 relative z-10 w-full">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-bold backdrop-blur-sm shadow-sm ring-1 ring-red-100">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="relative z-10 w-full mt-auto">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-rose-950">{formatCurrency(totalPengeluaran)}</h3>
            <p className="text-sm font-semibold text-rose-700/80 mt-1">Total pengeluaran approved</p>
          </div>
        </div>

        {/* Card 3: Laba Bersih */}
        <div className="bg-[#F0F9FF] p-5 rounded-3xl shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-end gap-3 mb-4 relative z-10 w-full">
            {totalPemasukan === 0 && labaBersih === 0 ? null : profitMargin > 20 ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-bold rounded-lg border border-emerald-200/50 shadow-sm whitespace-nowrap">
                Sangat Sehat <span className="text-[9px] sm:text-[10px] bg-white/50 px-1 sm:px-1.5 rounded text-emerald-700 hidden xl:inline">{profitMargin.toFixed(1)}%</span>
              </div>
            ) : profitMargin > 10 ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-100/90 text-yellow-800 text-[10px] sm:text-xs font-bold rounded-lg border border-yellow-200/50 shadow-sm whitespace-nowrap">
                Cukup Sehat <span className="text-[9px] sm:text-[10px] bg-white/50 px-1 sm:px-1.5 rounded text-yellow-700 hidden xl:inline">{profitMargin.toFixed(1)}%</span>
              </div>
            ) : profitMargin >= 0 ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100/90 text-orange-800 text-[10px] sm:text-xs font-bold rounded-lg border border-orange-200/50 shadow-sm whitespace-nowrap">
                Waspada <span className="text-[9px] sm:text-[10px] bg-white/50 px-1 sm:px-1.5 rounded text-orange-700 hidden xl:inline">{profitMargin.toFixed(1)}%</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-100/90 text-rose-800 text-[10px] sm:text-xs font-bold rounded-lg border border-rose-200/50 shadow-sm whitespace-nowrap">
                Kondisi Merugi <span className="text-[9px] sm:text-[10px] bg-white/50 px-1 sm:px-1.5 rounded text-rose-700 hidden xl:inline">{profitMargin.toFixed(1)}%</span>
              </div>
            )}
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold backdrop-blur-sm shadow-sm ring-1 ring-blue-100 shrink-0">
              <PieChart size={20} />
            </div>
          </div>
          <div className="relative z-10 w-full mt-auto">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-blue-950">{formatCurrency(labaBersih)}</h3>
            <p className="text-sm font-semibold text-blue-700/80 mt-1">Total laba bersih</p>
          </div>
        </div>

        {/* Card 4: Total Transaksi */}
        <div className="bg-[#FAF5FF] p-5 rounded-3xl shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-start justify-end mb-4 relative z-10 w-full">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold backdrop-blur-sm shadow-sm ring-1 ring-purple-100">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="relative z-10 w-full mt-auto">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-purple-950">{totalTransactions}</h3>
            <p className="text-sm font-semibold text-purple-700/80 mt-1">Total transaksi kasir</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-6">
             <BarChart3 className="text-slate-400" size={20} />
             <h3 className="text-lg font-bold text-slate-900">Tren Finansial Harian</h3>
          </div>
          <div className="h-[520px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis width={60} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => {
                  if (val >= 1000000) return (val / 1000000) + 'jt';
                  if (val >= 1000) return (val / 1000) + 'rb';
                  return val;
                }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value || 0)}
                  labelStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Line type="monotone" name="Pemasukan" dataKey="pemasukan" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Pengeluaran" dataKey="pengeluaran" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Top Products */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 animate-in">
               <Package className="text-slate-400" size={20} />
               <h3 className="text-lg font-bold text-slate-900">Top 5 Produk Terlaris</h3>
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
               {topProducts.length > 0 ? topProducts.map((p, i) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                       #{i + 1}
                     </div>
                     <div className="font-semibold text-slate-800 text-sm max-w-[120px] truncate">{p.name}</div>
                   </div>
                   <div className="text-emerald-600 font-extrabold text-sm">{p.qty}x</div>
                 </div>
               )) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium h-full">Belum ada data produk</div>
               )}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4 animate-in">
               <Receipt className="text-slate-400" size={20} />
               <h3 className="text-lg font-bold text-slate-900">Breakdown Pengeluaran</h3>
            </div>
            
            <div className="flex-1 flex flex-col gap-3 min-h-[150px]">
               {Object.keys(expenseBreakdown).length > 0 ? Object.entries(expenseBreakdown).map(([cat, amt], i) => (
                 <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${cat === 'Bahan Baku' ? 'bg-amber-400' : cat === 'Operasional' ? 'bg-blue-400' : 'bg-rose-400'}`}></div>
                     <span className="font-bold text-slate-700 text-sm">{cat}</span>
                   </div>
                   <div className="text-slate-900 font-bold text-sm">{formatCurrency(amt)}</div>
                 </div>
               )) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium h-full">Belum ada data pengeluaran</div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900">Transaksi Terakhir (POS)</h3>
          </div>
          <button onClick={() => router.push('/transactions')} className="text-sm font-bold text-violet-600 hover:text-violet-700">Lihat Semua</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pelanggan</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Item Detail</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Total Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recentTransactions.map((tx, i) => {
                let parsedItems = [];
                if (typeof tx.items === "string") {
                  try { parsedItems = JSON.parse(tx.items); } catch(e) {}
                } else if (Array.isArray(tx.items)) {
                  parsedItems = tx.items;
                }
                const firstItem = parsedItems[0]?.name || 'Item tidak diketahui';
                const itemsCount = parsedItems.length;

                return (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-slate-500">
                      {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} 
                      <span className="text-slate-300 mx-2">|</span>
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <div className="font-bold text-slate-800">a.n. {tx.customer_name || 'Umum'}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Via {tx.payment_method}</div>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <span className="font-medium text-slate-700">{firstItem}</span>
                      {itemsCount > 1 && <span className="text-slate-400 text-xs ml-1">+{itemsCount - 1} lainnya</span>}
                    </td>
                    <td className="py-4 px-6 text-sm font-extrabold text-emerald-600 text-right">
                      {formatCurrency(tx.total_price)}
                    </td>
                  </tr>
                );
              })}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-medium text-sm">Belum ada transaksi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 p-6 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Catat Pengeluaran</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-900"><X size={18} /></button>
            </div>
              
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Judul Pengeluaran</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900 font-medium"
                  value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Cth: Belanja Gula Pasir" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nominal Pengeluaran (Rp)</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xl font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900"
                  value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategori</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900 font-medium"
                  value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option value="Inventory">Bahan Baku (Inventory)</option>
                  <option value="Operational">Operasional (Listrik, Wifi)</option>
                  <option value="Maintenance">Maintenance & Perbaikan</option>
                  <option value="Marketing">Marketing / Promosi</option>
                  <option value="Lainnya">Lainnya...</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Catatan Tambahan</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all text-slate-900 min-h-[60px]"
                  value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Keterangan (opsional)..." />
              </div>
            </div>
              
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => setShowExpenseModal(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors">Batal</button>
              <button 
                onClick={submitExpense}
                disabled={isSubmitting || !formData.title || formData.amount <= 0}
                className="flex-[2] py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
