"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Product } from "../context/AppContext";
import { Plus, Search, Edit2, Trash2, X, AlertTriangle } from "lucide-react";

export default function ProductsPage() {
  const { products, setProducts, role } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role !== "Owner") {
      if (role === "Kasir") router.push("/pos");
      if (role === "Staf") router.push("/reimburse");
    }
  }, [role, router]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    hpp: 0,
    price: 0,
    stock: 0,
  });

  if (role !== "Owner") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const handleSave = () => {
    const newProduct: Product = {
      id: `P${Math.floor(Math.random() * 1000)}`,
      name: formData.name,
      category: formData.category || "General",
      hpp: Number(formData.hpp),
      price: Number(formData.price),
      stock: Number(formData.stock),
      icon: "Box"
    };
    setProducts([...products, newProduct]);
    setIsModalOpen(false);
    setFormData({ name: "", category: "", hpp: 0, price: 0, stock: 0 });
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const marginRp = Number(formData.price) - Number(formData.hpp);
  const marginPct = formData.hpp > 0 ? (marginRp / formData.hpp) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Master Produk & HPP</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Manage your inventory and pricing</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
        >
          <Plus size={18} />
          Tambah Produk
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
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
                <th className="py-4 px-6 font-semibold">Nama Produk</th>
                <th className="py-4 px-6 font-semibold">HPP</th>
                <th className="py-4 px-6 font-semibold">Harga Jual</th>
                <th className="py-4 px-6 font-semibold">Margin</th>
                <th className="py-4 px-6 font-semibold">Stok</th>
                <th className="py-4 px-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const pMarginRp = p.price - p.hpp;
                const pMarginPct = p.hpp > 0 ? (pMarginRp / p.hpp) * 100 : 0;
                const stockIsLow = p.stock < 10;
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100">
                           {p.icon === "Coffee" ? <span className="font-bold text-xs px-1">☕</span> : <span className="font-bold text-xs px-1">📦</span>}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700 text-sm">{formatCurrency(p.hpp)}</td>
                    <td className="py-4 px-6 font-bold text-slate-900 text-sm">{formatCurrency(p.price)}</td>
                    <td className="py-4 px-6">
                      <div className={`font-bold inline-flex items-center text-sm ${
                        pMarginRp > 0 
                          ? 'text-emerald-500' 
                          : pMarginRp < 0 
                          ? 'text-rose-500'
                          : 'text-slate-500'
                      }`}>
                        {pMarginPct.toFixed(0)}%
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${stockIsLow ? 'text-rose-500' : 'text-slate-700'}`}>{p.stock} units</span>
                        {stockIsLow && (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                            <AlertTriangle size={12} /> Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm font-medium">Tidak ada data produk ditemukan.</td>
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
                <h3 className="text-lg font-bold text-slate-900">Tambah Produk Baru</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nama Produk</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Cth: Kopi Arabica" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">HPP / Modal</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.hpp || ''} onChange={(e) => setFormData({...formData, hpp: Number(e.target.value)})} placeholder="0" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Harga Jual</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.price || ''} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} placeholder="0" />
                </div>

                <div className="col-span-2 my-1">
                   <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                     <span className="text-sm font-semibold text-slate-600">Estimasi Untung per Porsi:</span>
                     <div className="text-right">
                       <p className={`text-lg font-bold ${marginRp > 0 ? 'text-emerald-600' : marginRp < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                         {formatCurrency(marginRp)}
                       </p>
                     </div>
                   </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Stok Awal</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.stock || ''} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} placeholder="0" />
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
                disabled={!formData.name || !formData.price}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Simpan Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
