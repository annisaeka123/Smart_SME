"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Ingredient } from "../context/AppContext";
import { Plus, Search, Edit2, Trash2, X, Package } from "lucide-react";

export default function InventoryPage() {
  const { inventory, setInventory, role } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role !== "Owner") {
      if (role === "Kasir") router.push("/pos");
      if (role === "Staf") router.push("/reimburse");
    }
  }, [role, router]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<Partial<Ingredient>>({
    name: "",
    stock: 0,
    unit: "kg",
    price: 0,
  });

  if (role !== "Owner") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const handleSave = () => {
    if (!formData.name || !formData.unit || formData.price === undefined || formData.stock === undefined) return;
    const newIngredient: Ingredient = {
      id: `INV-${Date.now()}`,
      name: formData.name,
      stock: Number(formData.stock),
      unit: formData.unit,
      price: Number(formData.price),
    };
    setInventory([...inventory, newIngredient]);
    setIsModalOpen(false);
    setFormData({ name: "", stock: 0, unit: "kg", price: 0 });
  };

  const handleDelete = (id: string) => {
    setInventory(inventory.filter((p) => p.id !== id));
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
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
        >
          <Plus size={18} />
          Tambah Bahan Baku
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
            <thead>
              <tr className="bg-white text-xs font-semibold text-slate-500 tracking-wide border-b border-slate-200">
                <th className="py-4 px-6 font-semibold">Nama Bahan</th>
                <th className="py-4 px-6 font-semibold">Stok Saat Ini</th>
                <th className="py-4 px-6 font-semibold">Satuan Beli</th>
                <th className="py-4 px-6 font-semibold">Harga Beli</th>
                <th className="py-4 px-6 font-semibold">Cost per Unit Base</th>
                <th className="py-4 px-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tambah Bahan Baku</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nama Bahan</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Cth: Sirup Vanilla" />
                </div>
                
                <div>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Stok Awal</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.stock || ''} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} placeholder="0" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Harga Beli</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.price || ''} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} placeholder="0" />
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl bg-slate-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name || !formData.price || !formData.unit}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Simpan Bahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
