"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { Filter, Download, ClipboardList, Banknote, CheckCircle, Search, UploadCloud, Loader2, X, AlertTriangle, Eye, Check, XSquare, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ReimbursementPage() {
  const { reimbursements, setReimbursements, role } = useAppContext();
  const router = useRouter();

  const fetchExpenses = async () => {
    const { data } = await supabase.from("expenses").select("*").eq("type", "reimbursement").order("created_at", { ascending: false });
    if (data) {
      setReimbursements(data as any); 
    }
  };

  useEffect(() => {
    if (role === "Kasir") {
      router.push("/pos");
      return;
    }
    fetchExpenses();
  }, [role, router]);

  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    amount: 0,
    category: "Inventory",
    notes: ""
  });

  // Action Modals State
  const [showReceiptModal, setShowReceiptModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [actionConfirm, setActionConfirm] = useState<{ id: string, type: 'approved' | 'rejected', title: string, amount: number, staff: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [ocrMessage, setOcrMessage] = useState("");

  if (role === "Kasir") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const pendingReimbursements = reimbursements.filter(r => r.status === 'pending');
  const approvedTotal = reimbursements.filter(r => r.status === 'approved').length;
  const pendingAmount = pendingReimbursements.reduce((acc, curr) => acc + curr.amount, 0);

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
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal memanggil API OCR Gemini");
      }
      
      let finalCategory = "Inventory";
      const catLower = (data.category || "").toLowerCase();
      if (catLower.includes("operasional") || catLower.includes("listrik") || catLower.includes("wifi")) {
        finalCategory = "Operational";
      } else if (catLower.includes("maintenance") || catLower.includes("perbaikan")) {
        finalCategory = "Maintenance";
      } else if (catLower.includes("marketing") || catLower.includes("promosi")) {
        finalCategory = "Marketing";
      } else if (catLower.includes("lainnya")) {
        finalCategory = "Lainnya";
      }

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        amount: data.amount || prev.amount,
        category: finalCategory
      }));

      if (data.isFallback) {
        setOcrMessage(data.message || "AI sibuk. Silakan isi nominal secara manual.");
      } else {
        setOcrMessage("Berhasil dianalisis oleh Gemini AI!");
      }
    } catch (e: any) {
      console.error("Gemini Error:", e);
      setOcrMessage(e.message || "Gagal membaca nota otomatis. Silakan ketik nominal.");
    }

    setIsScanning(false);
    setShowFormModal(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          
        if (uploadError) throw new Error("Gagal mengupload foto struk: " + uploadError.message);
        
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
        status: 'pending',
        type: 'reimbursement' // Menandakan bahwa ini adalah reimbursement staf
      };
      
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw new Error("Gagal menyimpan data: " + error.message);
      
      await fetchExpenses();
      
      setShowFormModal(false);
      setUploadedFile(null);
      setPreviewUrl("");
      setOcrMessage("");
      setFormData({ title: "", amount: 0, category: "Inventory", notes: "" });
    } catch (e: any) {
      console.error("Error submitting expense:", e);
      alert(e.message);
    }
    
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async () => {
    if (!actionConfirm) return;
    try {
      const { error } = await supabase.from("expenses").update({ 
        status: actionConfirm.type,
        notes: actionConfirm.type === 'rejected' && rejectReason ? `Ditolak: ${rejectReason}` : undefined
      }).eq("id", actionConfirm.id);
      
      if (error) throw error;
      await fetchExpenses();
      setActionConfirm(null);
      setRejectReason("");
    } catch (e: any) {
      alert("Error updating status: " + e.message);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", deleteConfirm.id);
      if (error) throw error;
      await fetchExpenses();
      setDeleteConfirm(null);
    } catch (e: any) {
      alert("Error deleting: " + e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Pengajuan Reimbursement
          </h2>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            {role === 'Owner' ? 'Review dan kelola pengajuan klaim dana staf (Pending Approval).' : 'Gunakan AI untuk scan bukti nota pembayaran Anda untuk pengajuan (Pending).'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pending Approval</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{pendingReimbursements.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
            <ClipboardList size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:shadow-md">
          <div>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Amount Pending</p>
             <h3 className="text-3xl font-extrabold text-slate-900">{formatCurrency(pendingAmount)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
            <Banknote size={24} />
          </div>
        </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {role === 'Staf' && (
          <div className="lg:col-span-1">
            <div 
              className={`bg-white h-full p-8 rounded-3xl border-2 border-dashed ${dragActive ? 'border-violet-500 bg-violet-50/50' : 'border-slate-200'} transition-all text-center flex flex-col justify-center items-center shadow-sm relative overflow-hidden`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); }}
            >
               {isScanning ? (
                  <div className="flex flex-col items-center justify-center space-y-4 py-8">
                    <Loader2 className="animate-spin text-violet-600" size={48} />
                    <h4 className="font-bold text-slate-900 text-lg">AI sedang membaca nota...</h4>
                    <p className="text-xs font-medium text-slate-500">Mengekstrak data nominal secara pintar menggunakan Vercel AI SDK</p>
                  </div>
               ) : (
                 <div className="py-2">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4 shadow-sm border border-slate-100">
                      <UploadCloud size={28} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Upload Nota / Struk</h4>
                    <p className="text-xs font-medium text-slate-500 mb-6 max-w-xs mx-auto">AI OCR akan mengekstrak otomatis Judul dan Nominal dari bukti struk belanja Anda untuk pengajuan.</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-violet-600 hover:bg-violet-700 w-full text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-colors text-sm"
                    >
                      Pilih File Foto
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Reimbursement Table */}
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col pt-6 ${role === 'Owner' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="px-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Histori Pengeluaran</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1 h-[400px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Detail</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Nominal</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Status / File</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reimbursements.map((r, i) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-sm">{r.title}</div>
                        <div className="text-[11px] font-semibold text-slate-400 mt-1">
                          {new Date(r.created_at || r.date || "").toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • {r.category}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                             r.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                             r.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                             'bg-amber-50 text-amber-600 border-amber-200'
                           }`}>
                             {r.status}
                           </span>
                           {r.receipt_url && (
                             <button onClick={() => setShowReceiptModal(r.receipt_url || null)} className="text-slate-400 hover:text-violet-600 transition-colors cursor-pointer" title="Lihat Foto Struk">
                               <Eye size={18} />
                             </button>
                           )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          {r.status === 'pending' && role === 'Owner' && (
                            <>
                              <button onClick={() => setActionConfirm({ id: r.id, type: 'approved', title: r.title, amount: r.amount, staff: (r as any).staff_name || 'Staf' })} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded bg-white shadow-sm border border-slate-200 hover:border-emerald-200 transition-all" title="Approve">
                                <Check size={14} strokeWidth={3} />
                              </button>
                              <button onClick={() => setActionConfirm({ id: r.id, type: 'rejected', title: r.title, amount: r.amount, staff: (r as any).staff_name || 'Staf' })} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded bg-white shadow-sm border border-slate-200 hover:border-orange-200 transition-all" title="Reject">
                                <XSquare size={14} strokeWidth={2} />
                              </button>
                            </>
                          )}
                          {(role === 'Owner' || (role === 'Staf' && r.status === 'pending')) && (
                            <button onClick={() => setDeleteConfirm(r)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded bg-white shadow-sm border border-slate-200 hover:border-rose-200 transition-all" title="Hapus Data">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {reimbursements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-medium text-sm">Belum ada catatan pengeluaran.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal (Review OCR / Add Manual) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowFormModal(false)}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            
            <div className="w-full md:w-1/2 bg-slate-50 border-r border-slate-200 flex flex-col p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">{uploadedFile ? 'Bukti Nota / Struk' : 'Transaksi Tanpa Struk'}</h3>
              <div className="flex-1 bg-slate-200/50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden relative min-h-[200px]">
                {previewUrl ? (
                  <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-400">
                    <Banknote size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Tidak ada bukti fisik</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Form Pengeluaran</h3>
                  {ocrMessage && (
                    <p className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${ocrMessage.includes("berhasil") ? 'text-emerald-600' : 'text-amber-600'}`}>
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
                  {role === 'Owner' ? 'Simpan Data' : 'Kirim Pengajuan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Verify Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-rose-50">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Hapus Riwayat?</h3>
              <p className="text-slate-500 text-sm">Apakah Anda yakin ingin menghapus data pengeluaran <span className="font-bold text-slate-700">{deleteConfirm.title}</span>? Aksi ini permanen.</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                Batal
              </button>
              <button onClick={executeDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sm">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Verify Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActionConfirm(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">Konfirmasi {actionConfirm.type === 'approved' ? 'Persetujuan' : 'Penolakan'}</h3>
              
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm">
                <p className="text-slate-700 mb-2">
                  Apakah Anda yakin ingin {actionConfirm.type === 'approved' ? 'menyetujui' : 'menolak'} pencairan dana untuk:
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Judul</span><span className="font-bold text-slate-900">{actionConfirm.title}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Nominal</span><span className="font-bold text-slate-900">{formatCurrency(actionConfirm.amount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Diajukan oleh</span><span className="font-bold text-slate-900">{actionConfirm.staff}</span></div>
                </div>
              </div>

              {actionConfirm.type === 'rejected' && (
                <div className="pt-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alasan Penolakan (Opsional)</label>
                   <textarea 
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all text-slate-900 min-h-[80px]"
                      placeholder="Tuliskan jika ada alasan penolakan..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                   />
                </div>
              )}
            </div>
            <div className={`p-4 border-t border-slate-100 flex gap-3 ${actionConfirm.type === 'approved' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
              <button onClick={() => setActionConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                Batal
              </button>
              <button onClick={handleUpdateStatus} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${actionConfirm.type === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {actionConfirm.type === 'approved' ? <CheckCircle size={16} /> : <XSquare size={16} />}
                {actionConfirm.type === 'approved' ? 'Setujui Data' : 'Tolak Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowReceiptModal(null)}></div>
          <div className="relative z-10 max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button onClick={() => setShowReceiptModal(null)} className="absolute -top-12 right-0 text-white hover:text-slate-300 bg-slate-800/50 rounded-full p-2 backdrop-blur-md">
              <X size={24} />
            </button>
            <img src={showReceiptModal} alt="Bukti Nota" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20 bg-black/20" />
          </div>
        </div>
      )}
    </div>
  );
}
