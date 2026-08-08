"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Ingredient } from "../context/AppContext";
import { Plus, Search, Edit2, Trash2, X, Package } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function InventoryPage() {
  const { inventory, setInventory, role } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role !== "Owner") {
      if (role === "Kasir") router.push("/pos");
      if (role === "Staf") router.push("/reimburse");
      return;
    }
    fetchInventory();
  }, [role, router]);

  const fetchInventory = async () => {
    const { data, error } = await supabase.from("inventory").select("*");
    if (data && !error) {
      setInventory(data.map((d: any) => ({ ...d, price: d.cost_per_unit })));
    }
  };

  const [modalMode, setModalMode] = useState<"ADD" | "EDIT" | "RESTOCK" | "DELETE" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [priceInputMode, setPriceInputMode] = useState<"SATUAN" | "TOTAL">("TOTAL");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<{
    name: string;
    stock: number;
    unit: string;
    price: number;
  }>({ name: "", stock: 0, unit: "kg", price: 0 });

  const openAddModal = () => {
    setModalMode("ADD");
    setSelectedItem(null);
    setPriceInputMode("TOTAL");
    setFormData({ name: "", stock: 0, unit: "kg", price: 0 });
  };

  const openEditModal = (item: any) => {
    setModalMode("EDIT");
    setSelectedItem(item);
    setFormData({ 
      name: item.name, 
      unit: item.unit,
      stock: item.stock,
      price: item.price
    });
  };

  const openRestockModal = (item: any) => {
    setModalMode("RESTOCK");
    setSelectedItem(item);
    setPriceInputMode("TOTAL");
    setFormData({ 
      name: item.name,
      unit: item.unit,
      stock: 0,
      price: 0   
    });
  };

  const openDeleteModal = (item: any) => {
    setModalMode("DELETE");
    setSelectedItem(item);
  };

  if (role !== "Owner") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const handleSave = async () => {
    try {
      if (modalMode === "ADD") {
        if (!formData.name || !formData.unit || formData.price === undefined || formData.stock === undefined || formData.stock <= 0) return;
        
        let cost_per_unit = formData.price;
        if (priceInputMode === "TOTAL") {
          cost_per_unit = formData.price / formData.stock;
        }

        const ingredientPayload = {
          name: formData.name,
          stock: Number(formData.stock),
          unit: formData.unit,
          cost_per_unit: cost_per_unit,
        };
        
        const { error } = await supabase.from("inventory").insert(ingredientPayload);
        if (error) throw error;
        
      } else if (modalMode === "EDIT" && selectedItem) {
        if (!formData.name || !formData.unit || formData.stock === undefined || formData.price === undefined) return;
        
        const updatePayload = {
          name: formData.name,
          unit: formData.unit,
          stock: Number(formData.stock),
          cost_per_unit: Number(formData.price),
        };
        
        const { error } = await supabase.from("inventory").update(updatePayload).eq("id", selectedItem.id);
        if (error) throw error;

      } else if (modalMode === "RESTOCK" && selectedItem) {
        if (!formData.stock || formData.stock <= 0 || formData.price === undefined) return;
        
        let cost_per_unit_baru = formData.price;
        if (priceInputMode === "TOTAL") {
          cost_per_unit_baru = formData.price / formData.stock;
        }
        
        const stok_total_baru = Number(selectedItem.stock) + Number(formData.stock);
        
        const updatePayload = {
          stock: stok_total_baru,
          cost_per_unit: cost_per_unit_baru,
        };
        
        const { error } = await supabase.from("inventory").update(updatePayload).eq("id", selectedItem.id);
        if (error) throw error;
      }
      
      await fetchInventory();
      setModalMode(null);
    } catch (e: any) {
      console.error("Error saving inventory:", e);
      alert("Gagal memproses data: " + e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", selectedItem.id);
      if (error) throw error;
      
      await fetchInventory();
      setModalMode(null);
    } catch (e: any) {
      console.error("Error deleting inventory:", e);
      alert("Gagal menghapus bahan baku: " + e.message);
    }
  };

  const filteredInventory = inventory.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stok & Harga Bahan Baku</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Manage your raw materials</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
        >
          <Plus size={18} />
          Tambah Bahan Baku Baru
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Bahan</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stok Saat Ini</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Satuan Beli</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Beli</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cost per Unit Base</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredInventory.map((item) => {
                let stockThreshold = 10;
                if (item.unit === 'kg' || item.unit === 'Liter') stockThreshold = 2;
                const stockIsLow = item.stock < stockThreshold;
                
                let baseUnit = item.unit;
                let costPerBase = item.price;
                if (item.unit === 'kg') {
                  baseUnit = 'gram';
                  costPerBase = item.price / 1000;
                } else if (item.unit === 'Liter') {
                  baseUnit = 'ml';
                  costPerBase = item.price / 1000;
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100">
                           <Package size={16} />
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${stockIsLow ? 'text-amber-500' : 'text-slate-700'}`}>{item.stock}</span>
                        {stockIsLow ? (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                            Stok Cukup
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-500 text-sm">{item.unit}</td>
                    <td className="py-4 px-6 font-bold text-slate-900 text-sm">{formatCurrency(item.price)} / {item.unit}</td>
                    <td className="py-4 px-6 font-semibold text-indigo-600 text-sm">{formatCurrency(costPerBase)} / {baseUnit}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openRestockModal(item)} className="p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-100" title="Restok Bahan Baku">
                          <Plus size={16} />
                        </button>
                        <button onClick={() => openEditModal(item)} className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Edit Informasi">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => openDeleteModal(item)} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Hapus Bahan">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm font-medium">Tidak ada data bahan baku.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && modalMode !== 'DELETE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMode(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === 'ADD' && 'Tambah Bahan Baku Baru'}
                  {modalMode === 'EDIT' && 'Edit Bahan Baku'}
                  {modalMode === 'RESTOCK' && `Restok Bahan Baku: ${selectedItem?.name}`}
                </h3>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-500 hover:text-slate-900 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(modalMode === 'ADD' || modalMode === 'EDIT') && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nama Bahan</label>
                      <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                        value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Cth: Sirup Vanilla" />
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Satuan Beli</label>
                      <select 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                        value={formData.unit || 'kg'}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      >
                        <option value="kg">kg</option>
                        <option value="gram">gram</option>
                        <option value="Liter">Liter</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>
                  </>
                )}
                
                {(modalMode === 'ADD' || modalMode === 'RESTOCK' || modalMode === 'EDIT') && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                        {modalMode === 'RESTOCK' ? 'Jumlah Tambahan Stok' : modalMode === 'EDIT' ? 'Jumlah Stok Manual' : 'Stok Awal'}
                      </label>
                      <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                        value={formData.stock || ''} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} placeholder="0" />
                    </div>
                  </>
                )}

                {(modalMode === 'ADD' || modalMode === 'RESTOCK') && (
                  <div className="col-span-2 space-y-3">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode Input Harga</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setPriceInputMode("SATUAN")}
                        className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-all ${priceInputMode === "SATUAN" ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Harga Satuan
                      </button>
                      <button 
                        onClick={() => setPriceInputMode("TOTAL")}
                        className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-all ${priceInputMode === "TOTAL" ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Harga Total Belanja
                      </button>
                    </div>
                  </div>
                )}
                
                {(modalMode === 'ADD' || modalMode === 'RESTOCK' || modalMode === 'EDIT') && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      {modalMode === 'EDIT' 
                        ? 'Harga Modal (per satuan)' 
                        : priceInputMode === "SATUAN" 
                          ? 'Harga Satuan Baru (Rp)' 
                          : 'Harga Total Belanja Baru (Rp)'}
                    </label>
                    <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                      value={formData.price || ''} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} placeholder="0" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl bg-slate-50">
              <button 
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name && modalMode === 'ADD' || formData.price === undefined || formData.stock === undefined || formData.stock === 0 && modalMode !== 'EDIT'}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {modalMode === 'EDIT' ? 'Simpan Perubahan' : modalMode === 'RESTOCK' ? 'Update Stok & HPP' : 'Simpan Bahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'DELETE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMode(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-rose-50">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Hapus Bahan Baku?</h3>
              <p className="text-slate-500 text-sm">Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-700">{selectedItem?.name}</span>? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button 
                onClick={() => setModalMode(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
