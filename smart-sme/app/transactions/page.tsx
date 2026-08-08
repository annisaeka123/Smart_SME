"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { Wallet, Banknote, ArrowDownCircle, ArrowUpCircle, X, CheckCircle, UploadCloud, Loader2, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function TransactionsPage() {
  const { role } = useAppContext();
  const router = useRouter();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'ALL'|'IN'|'OUT'>('ALL');
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [ocrMessage, setOcrMessage] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    category: "Operational",
    notes: ""
  });

  const fetchData = async () => {
    const [trxRes, expRes] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    ]);

    if (trxRes.data) setTransactions(trxRes.data);
    if (expRes.data) setExpenses(expRes.data);
  };

  const getParsedItems = (itemsData: any) => {
    if (!itemsData) return [];
    if (typeof itemsData === 'string') {
      try { return JSON.parse(itemsData); } catch (e) { return []; }
    }
    if (Array.isArray(itemsData)) return itemsData;
    return [];
  };

  useEffect(() => {
    if (role === "Staf") {
      router.push("/reimburse");
      return;
    }
    fetchData();
  }, [role, router]);

  if (role === "Staf") return null;

  const totalPemasukan = transactions.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const totalPengeluaran = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const saldoBersih = totalPemasukan - totalPengeluaran;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const mutasi = [
    ...transactions.map(t => ({ ...t, type: 'IN', date: new Date(t.created_at) })),
    ...expenses.map(e => ({ ...e, type: 'OUT', date: new Date(e.created_at) }))
  ]
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .filter(item => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    setIsScanning(true);
    setUploadedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setOcrMessage("");

    try {
      const dataForm = new FormData();
      dataForm.append('file', file);
      
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: dataForm
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal memanggil API OCR");
      }
      
      let finalCategory = "Operational";
      const catLower = (data.category || "").toLowerCase();
      if (catLower.includes("inventory") || catLower.includes("bahan baku")) {
        finalCategory = "Inventory";
      } else if (catLower.includes("maintenance") || catLower.includes("perbaikan")) {
        finalCategory = "Maintenance";
      } else if (catLower.includes("marketing") || catLower.includes("promosi")) {
        finalCategory = "Marketing";
      }

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        amount: data.amount || prev.amount,
        category: finalCategory
      }));

      if (data.isFallback) {
        setOcrMessage(data.message || "AI sibuk. Silakan ketik nominal manual.");
      } else {
        setOcrMessage("Berhasil dianalisis oleh Vercel AI!");
      }
    } catch (e: any) {
      console.error("OCR Error:", e);
      setOcrMessage(e.message || "Gagal membaca nota. Silakan ketik nominal.");
    }

    setIsScanning(false);
  };

  const submitExpense = async () => {
    if (!formData.title || formData.amount <= 0) return;
    setIsSubmitting(true);
    
    try {
      let receipt_url = "";
      
      if (uploadedFile) {
        const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9.-]/g, '');
        const fileName = `${Date.now()}-${safeName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, uploadedFile);
          
        if (uploadError) throw new Error("Gagal mengupload nota: " + uploadError.message);
        
        const { data: publicData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
          
        receipt_url = publicData.publicUrl;
      }

      const payload = {
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        notes: formData.notes,
        receipt_url,
        status: 'approved', // Otomatis Approved untuk form ini
        type: 'owner_expense'
      };
      
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw new Error("Gagal menyimpan data: " + error.message);
      
      await fetchData();
      
      setShowFormModal(false);
      setUploadedFile(null);
      setPreviewUrl("");
      setOcrMessage("");
      setFormData({ title: "", amount: 0, category: "Operational", notes: "" });
    } catch (e: any) {
      console.error("Error submitting expense:", e);
      alert(e.message);
    }
    setIsSubmitting(false);
  };

  const openReceipt = (transaction: any) => {
    setSelectedReceipt(transaction);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Transaksi & Mutasi Kas</h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Lacak aliran uang masuk dan catat pengeluaran langsung milik toko.</p>
        </div>
        <div className="flex gap-3">
          {role === 'Owner' && (
             <button onClick={() => setShowFormModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm text-sm transition-colors flex items-center gap-2">
               + Tambah Pengeluaran Langsung
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Pemasukan</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalPemasukan)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ArrowDownCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Pengeluaran (Approved)</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalPengeluaran)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
            <ArrowUpCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Saldo Kas Bersih</p>
             <h3 className={`text-3xl font-extrabold ${saldoBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
               {formatCurrency(saldoBersih)}
             </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col pt-6">
        <div className="px-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
            <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
            <button onClick={() => setFilterType('IN')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'IN' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Pemasukan</button>
            <button onClick={() => setFilterType('OUT')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'OUT' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Pengeluaran</button>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari transaksi..." className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all" />
          </div>
        </div>
        
        <div className="overflow-x-auto h-[500px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 shadow-sm z-10">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Keterangan</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipe</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Nominal</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {mutasi.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 text-sm font-semibold text-slate-600">
                    {item.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800 text-sm">
                      {item.type === 'IN' ? (
                        <div>
                           <span className="font-mono text-xs text-slate-500 mr-2">#TRX-{(item.id || '').substring(0,6).toUpperCase()}</span>
                           <span className="text-emerald-700">Penjualan via {item.payment_method?.toUpperCase() || 'CASH'}</span>
                           <div className="text-[11px] font-semibold text-slate-500 mt-1">
                             <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded mr-2">a.n. {item.customer_name || 'Pelanggan Umum'}</span>
                             {getParsedItems(item.items).length > 0 && (
                               <span className="text-slate-400 font-medium">({getParsedItems(item.items).map((ti: any) => `${ti.qty}x ${ti.name}`).join(", ")})</span>
                             )}
                           </div>
                        </div>
                      ) : item.title}
                    </div>
                    {item.type === 'OUT' && (
                      <div className="text-[11px] font-semibold text-slate-400 mt-1">
                        Kategori: {item.category}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      item.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {item.type === 'IN' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td className={`py-4 px-6 text-right font-bold text-sm ${item.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.type === 'IN' ? '+' : '-'}{formatCurrency(item.type === 'IN' ? (item.total_price || 0) : (item.amount || 0))}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {item.type === 'IN' && (
                      <button onClick={() => openReceipt(item)} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold transition-colors">
                        Buka Struk
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {mutasi.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-medium text-sm">Belum ada mutasi keuangan terekam.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowFormModal(false)}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            
            <div className="w-full md:w-1/2 bg-slate-50 border-r border-slate-200 flex flex-col p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">{uploadedFile ? 'Bukti Nota / Struk' : 'Fitur Scan OCR'}</h3>
              
              {!uploadedFile && !isScanning && (
                <div 
                  className="flex-1 bg-white rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-violet-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="text-slate-400 mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-600 text-center">Upload Foto Nota untuk Isi Otomatis</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
              )}

              {isScanning && (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200">
                  <Loader2 className="animate-spin text-violet-600" size={32} />
                  <p className="text-xs font-bold mt-3 text-slate-600">AI membaca nota...</p>
                </div>
              )}

              {uploadedFile && !isScanning && (
                <div className="flex-1 bg-slate-200/50 rounded-lg border border-slate-200 flex relative overflow-hidden h-40">
                  <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-contain" />
                  <button onClick={() => { setUploadedFile(null); setPreviewUrl(""); setOcrMessage(""); }} className="absolute top-2 right-2 bg-slate-900/50 text-white rounded-full p-1"><X size={14}/></button>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Form Pengeluaran Owner</h3>
                  {ocrMessage && (
                    <p className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${ocrMessage.includes("Berhasil") ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <CheckCircle size={10} /> {ocrMessage}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-900">
                  <X size={18} />
                </button>
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
                <button onClick={() => setShowFormModal(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors">Batal</button>
                <button 
                  onClick={submitExpense}
                  disabled={isSubmitting || !formData.title || formData.amount <= 0}
                  className="flex-[2] py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                  Simpan & Mutasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm relative z-10 flex flex-col animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
            <div className="bg-indigo-600 p-4 text-center text-white relative">
               <button onClick={() => setSelectedReceipt(null)} className="absolute top-3 right-3 text-indigo-200 hover:text-white z-20 p-2 cursor-pointer bg-indigo-700/30 hover:bg-indigo-700/60 rounded-full transition-colors"><X size={18} /></button>
               <h3 className="font-bold uppercase tracking-widest text-sm opacity-90 mb-1">Struk Digital</h3>
               <div className="text-2xl font-bold bg-white text-indigo-700 px-3 py-1 rounded inline-block shadow-sm">
                 #TRX-{(selectedReceipt.id || "").substring(0,6).toUpperCase()}
               </div>
            </div>
            
            <div className="p-5 flex flex-col max-h-[60vh] bg-slate-50 pb-0">
               <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-4 pb-4 border-b border-dashed border-slate-300">
                 <div>
                   <p>Waktu: {selectedReceipt.date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
                   <p className="mt-1 text-slate-700 font-bold">a.n. {selectedReceipt.customer_name || 'Pelanggan'}</p>
                 </div>
                 <div className="text-right">
                   <p>Kasir: {role}</p>
                   <p className="mt-1 font-bold">Via {selectedReceipt.payment_method?.toUpperCase() || 'CASH'}</p>
                 </div>
               </div>

               <div className="space-y-3 overflow-y-auto mb-4 custom-scrollbar flex-1">
                 {getParsedItems(selectedReceipt.items).length > 0 ? getParsedItems(selectedReceipt.items).map((ri: any, idx: number) => (
                   <div key={idx} className="flex justify-between text-sm">
                     <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight">{ri.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{ri.qty}x @ {formatCurrency(ri.price)}</p>
                     </div>
                     <p className="font-bold text-slate-900 self-center">{formatCurrency(ri.subtotal)}</p>
                   </div>
                 )) : (
                   <p className="text-center text-slate-400 text-xs py-4">Detail item tidak ditemukan.</p>
                 )}
               </div>
            </div>

            <div className="bg-white p-5 border-t border-dashed border-slate-300 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
               <div className="flex justify-between text-lg">
                 <span className="font-bold text-slate-800">Total Harga</span>
                 <span className="font-extrabold text-emerald-600">{formatCurrency(selectedReceipt.total_price)}</span>
               </div>
               
               <button onClick={() => window.print()} className="mt-4 w-full border-2 border-indigo-100 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white py-2.5 rounded-lg font-bold text-sm transition-colors uppercase tracking-widest">
                 Cetak Ulang Struk
               </button>
            </div>
            
            {/* Gerigi Bawah Struk */}
            <div className="h-3 w-full bg-slate-50" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, transparent 10px, white 10px)', backgroundSize: '20px 20px', backgroundPosition: '-10px -10px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
