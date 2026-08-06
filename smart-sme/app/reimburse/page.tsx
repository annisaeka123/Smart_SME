"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { Filter, Download, ClipboardList, Banknote, CheckCircle, Search, UploadCloud, Loader2 } from "lucide-react";

export default function ReimbursementPage() {
  const { reimbursements, setReimbursements, role } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role === "Kasir") router.push("/pos");
  }, [role, router]);

  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (role === "Kasir") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const pendingReimbursements = reimbursements.filter(r => r.status === 'Pending');
  const approvedTotal = reimbursements.filter(r => r.status === 'Approved').length;
  const pendingAmount = pendingReimbursements.reduce((acc, curr) => acc + curr.amount, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    setIsScanning(true);
    setTimeout(() => {
      const newReimburse = {
        id: `RMB-0${reimbursements.length + 1}`,
        date: new Date().toISOString(),
        thumbnail: "🧾",
        title: "Emergency Milk Restock",
        amount: 150000,
        status: "Pending" as const
      };
      setReimbursements([newReimburse, ...reimbursements]);
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {role === 'Owner' ? 'Reimbursement Approvals' : 'Reimbursement Submissions'}
          </h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            {role === 'Owner' ? 'Review and manage pending expenses from your staff.' : 'Submit your business expenses automatically.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
          <button className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pending Approval</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{pendingReimbursements.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
            <ClipboardList size={24} />
          </div>
        </div>

        {/* Total Amount Pending */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Amount Pending</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{formatCurrency(pendingAmount)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
            <Banknote size={24} />
          </div>
        </div>

        {/* Approved this Month */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Approved This Month</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{approvedTotal}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {role === 'Staf' && (
        <div 
          className={`bg-white p-10 rounded-3xl border-2 border-dashed ${dragActive ? 'border-violet-500 bg-violet-50/50' : 'border-slate-200'} transition-all text-center shadow-sm relative overflow-hidden`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); }}
        >
           {isScanning ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="animate-spin text-violet-600" size={48} />
                <h4 className="font-bold text-slate-900 text-lg">AI Reading Receipt...</h4>
                <p className="text-sm font-medium text-slate-500">Please wait while we extract the data</p>
              </div>
           ) : (
             <div className="py-6">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-6 shadow-sm border border-slate-100">
                  <UploadCloud size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Drag & Drop Receipt Here</h4>
                <p className="text-sm font-medium text-slate-500 mb-8 max-w-md mx-auto">Upload a clear photo of your receipt. Our AI will automatically extract the title and nominal for you.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-md transition-colors"
                >
                  Browse Files
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
             </div>
           )}
        </div>
      )}

      {/* Reimbursement Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col pt-6">
        <div className="px-8 pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Pengajuan Pending</h3>
          </div>
          <div className="relative">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search staff or item..."
               className="pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-64 text-slate-800"
             />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="py-4 px-8 text-xs font-semibold text-slate-500 uppercase tracking-widest">TGL</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Staf</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Keperluan</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Nominal</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Foto Struk</th>
                <th className="py-4 px-8 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingReimbursements.map((r, i) => {
                const names = ["Alex Lopez", "Sarah Miller", "Tom Jones"];
                const roles = ["Barista", "Store Manager", "Maintenance"];
                const initials = ["AL", "SM", "TJ"];
                const colors = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700"];
                
                const uName = names[i % 3];
                const uRole = roles[i % 3];
                const uInit = initials[i % 3];
                const uCol = colors[i % 3];
                
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-5 px-8 font-semibold text-slate-700 text-sm">
                      {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border border-white shadow-sm ${uCol}`}>
                          {uInit}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{uName}</div>
                          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{uRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                       <div className="font-bold text-slate-800 text-sm">{r.title}</div>
                       <div className="inline-block px-2 py-0.5 mt-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500">Inventory</div>
                    </td>
                    <td className="py-5 px-6 font-bold text-slate-900 text-sm">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-200 overflow-hidden text-xl cursor-pointer hover:opacity-80 transition-opacity">
                         {r.thumbnail}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right">
                      {role === 'Owner' && (
                        <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => {
                               setReimbursements(prev => prev.map(item => item.id === r.id ? { ...item, status: 'Approved' } : item));
                             }}
                             className="text-xs font-bold bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                           >Approve</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {pendingReimbursements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium text-sm">There are no pending submissions.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-white text-sm">
            <span className="text-slate-500 font-medium">Showing 1 to {pendingReimbursements.length} of 12 entries</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 border border-transparent text-slate-400 text-xs font-bold hover:text-slate-600">Prev</button>
              <button className="px-3 py-1.5 border border-slate-200 bg-white shadow-sm text-slate-800 text-xs font-bold rounded-lg hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
