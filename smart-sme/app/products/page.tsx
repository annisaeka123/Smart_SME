"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Product, getProductStock } from "../context/AppContext";
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, CheckCircle2, Coffee, Pizza, Package, Type } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ProductsPage() {
  const { products, setProducts, role, inventory, setInventory } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role !== "Owner") {
      if (role === "Kasir") router.push("/pos");
      if (role === "Staf") router.push("/reimburse");
      return;
    }
    fetchData();
  }, [role, router]);

  const fetchData = async () => {
    const { data: invData } = await supabase.from("inventory").select("*");
    if (invData) {
      setInventory(invData.map((d: any) => ({ ...d, price: d.cost_per_unit })));
    }

    const { data: prodData } = await supabase
      .from("products")
      .select("*, recipes(*)");
    
    if (prodData && invData) {
      const mappedProducts = prodData.map((p: any) => {
        const mappedRecipes = p.recipes?.map((r: any) => ({
          inventoryId: r.inventory_id || r.inventoryId,
          qty: r.quantity_needed || r.qty
        })) || [];
        
        let calculatedHpp = 0;
        mappedRecipes.forEach((r: any) => {
          const invItem = invData.find((i: any) => i.id === r.inventoryId);
          if (invItem) {
            let costPerBase = invItem.cost_per_unit || invItem.price || 0;
            if (invItem.unit === 'kg' || invItem.unit === 'Liter') {
              costPerBase = costPerBase / 1000;
            }
            calculatedHpp += (Number(r.qty) || 0) * costPerBase;
          }
        });

        return {
          ...p,
          price: p.selling_price || p.price,
          hpp: calculatedHpp || p.base_hpp || p.hpp,
          recipe: mappedRecipes
        };
      });
      setProducts(mappedProducts);
    }
  };

  const [modalMode, setModalMode] = useState<"ADD" | "EDIT" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<"SAVE" | "DELETE" | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Proses Berhasil!");
  
  const defaultCategories = ["Makanan", "Minuman", "Snack"];

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    hpp: 0,
    price: 0,
  });

  const [ingredients, setIngredients] = useState([{ id: 1, inventoryId: "", qty: 0 }]);

  const openAddModal = () => {
    setModalMode("ADD");
    setSelectedProduct(null);
    setFormData({ name: "", category: "Minuman", hpp: 0, price: 0 });
    setIngredients([{ id: Date.now(), inventoryId: "", qty: 0 }]);
    setIsCustomCategory(false);
    setConfirmModal(null);
  };

  const openEditModal = (product: any) => {
    setModalMode("EDIT");
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      hpp: product.hpp,
      price: product.price
    });
    setIsCustomCategory(!defaultCategories.includes(product.category));
    
    if (product.recipe && product.recipe.length > 0) {
      setIngredients(product.recipe.map((r: any, idx: number) => ({ id: Date.now() + idx, inventoryId: r.inventoryId, qty: r.qty })));
    } else {
      setIngredients([{ id: Date.now(), inventoryId: "", qty: 0 }]);
    }
  };

  useEffect(() => {
    let sum = 0;
    ingredients.forEach(ing => {
      const item = inventory.find(i => i.id === ing.inventoryId);
      if (item) {
        let costPerBase = item.price;
        if (item.unit === 'kg' || item.unit === 'Liter') {
          costPerBase = item.price / 1000;
        }
        sum += (Number(ing.qty) || 0) * costPerBase;
      }
    });
    setFormData(prev => ({ ...prev, hpp: sum }));
  }, [ingredients, inventory]);

  if (role !== "Owner") return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const attemptSave = () => {
    if (!formData.name || !formData.price || !formData.category) return;
    setConfirmModal("SAVE");
  };

  const openDeleteModal = (product: any) => {
    setSelectedProduct(product);
    setConfirmModal("DELETE");
  };

  const executeSave = async () => {
    try {
      const mappedRecipe = ingredients.map(ing => ({
        inventoryId: ing.inventoryId,
        qty: Number(ing.qty)
      })).filter(ing => ing.inventoryId && ing.qty > 0);

      const payload = {
        name: formData.name,
        category: formData.category || 'General',
        selling_price: Number((formData as any).price || (formData as any).selling_price || 0),
        base_hpp: Number(formData.hpp || 0)
      };

      if (modalMode === "ADD") {
        const { data: productData, error: productError } = await supabase.from("products").insert(payload).select().single();
        if (productError) throw productError;

        if (productData && mappedRecipe.length > 0) {
          const recipeInserts = mappedRecipe.map(r => ({
            product_id: productData.id,
            inventory_id: r.inventoryId,
            quantity_needed: r.qty
          }));
          const { error: recipeError } = await supabase.from("recipes").insert(recipeInserts);
          if (recipeError) console.error("Error inserting recipe:", recipeError.message);
        }
      } else if (modalMode === "EDIT" && selectedProduct) {
        const { error: updateError } = await supabase.from("products").update(payload).eq("id", selectedProduct.id);
        if (updateError) throw updateError;
        
        await supabase.from("recipes").delete().eq("product_id", selectedProduct.id);
        
        if (mappedRecipe.length > 0) {
          const recipeInserts = mappedRecipe.map(r => ({
            product_id: selectedProduct.id,
            inventory_id: r.inventoryId,
            quantity_needed: r.qty
          }));
          const { error: recipeError } = await supabase.from("recipes").insert(recipeInserts);
          if (recipeError) console.error("Error inserting recipe:", recipeError.message);
        }
      }
      
      await fetchData();
      setModalMode(null);
      setConfirmModal(null);
      setToastMessage(modalMode === "ADD" ? "Produk Berhasil Ditambahkan!" : "Produk Berhasil Diperbarui!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e: any) {
      console.error("Error saving product:", e);
      alert("Gagal menyimpan produk: " + e.message);
    }
  };

  const executeDelete = async () => {
    if (!selectedProduct) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", selectedProduct.id);
      if (error) throw error;
      
      await fetchData();
      setConfirmModal(null);
      setToastMessage("Produk Berhasil Dihapus!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e: any) {
      console.error("Error deleting product:", e);
      alert("Gagal menghapus produk: " + e.message);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const marginRp = Number(formData.price) - Number(formData.hpp);
  const marginPct = formData.hpp > 0 ? (marginRp / formData.hpp) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 shadow-xl rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 border border-emerald-500">
          <CheckCircle2 className="text-white" size={24} />
          <div>
            <p className="font-bold text-white text-sm">{toastMessage}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Produk & HPP</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Manage your inventory and pricing</p>
        </div>
        <button 
          onClick={openAddModal}
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
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Produk</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">HPP</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harga Jual</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Margin</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProducts.map((p) => {
                const pMarginRp = p.price - p.hpp;
                const pMarginPct = p.hpp > 0 ? (pMarginRp / p.hpp) * 100 : 0;
                
                const pCategory = (p.category || "").toLowerCase();
                let IconComponent = Package;
                if (pCategory.includes("makanan") || pCategory.includes("food") || pCategory.includes("snack")) {
                  IconComponent = Pizza;
                } else if (pCategory.includes("minuman") || pCategory.includes("drink") || pCategory.includes("kopi")) {
                  IconComponent = Coffee;
                }

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100 flex items-center justify-center">
                           <IconComponent size={20} />
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
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(p)} className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Edit Produk">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => openDeleteModal(p)} className="p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Hapus Produk">
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMode(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{modalMode === "ADD" ? "Tambah Produk Baru" : "Edit Produk"}</h3>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-500 hover:text-slate-900 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-4 sm:space-y-0 sm:flex sm:gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Nama Produk</label>
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Cth: Kopi Arabica" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</label>
                      <button type="button" onClick={() => setIsCustomCategory(!isCustomCategory)} className="text-[10px] flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full transition-colors">
                        {isCustomCategory ? "Pilih Preset" : "+ Kategori Baru"}
                      </button>
                    </div>
                    {isCustomCategory ? (
                      <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                        value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Ketik kategori bebas..." />
                    ) : (
                      <select 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="" disabled>Pilih kategori...</option>
                        {defaultCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                
                <div className="col-span-2 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Komposisi / Resep Bahan Baku</label>
                    <div className="text-sm font-bold text-indigo-600">Total HPP: {formatCurrency(formData.hpp)}</div>
                  </div>
                    
                    {ingredients.map((ing, index) => {
                      const selectedItem = inventory.find(i => i.id === ing.inventoryId);
                      let baseUnit = "-";
                      let subtotal = 0;
                      if (selectedItem) {
                        baseUnit = selectedItem.unit;
                        let costPerBase = selectedItem.price;
                        if (selectedItem.unit === 'kg') {
                          baseUnit = 'gram';
                          costPerBase = selectedItem.price / 1000;
                        } else if (selectedItem.unit === 'Liter') {
                          baseUnit = 'ml';
                          costPerBase = selectedItem.price / 1000;
                        }
                        subtotal = (Number(ing.qty) || 0) * costPerBase;
                      }

                      return (
                        <div key={ing.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <select
                            className="flex-1 min-w-[120px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                            value={ing.inventoryId}
                            onChange={(e) => {
                              const newIngredients = [...ingredients];
                              newIngredients[index].inventoryId = e.target.value;
                              setIngredients(newIngredients);
                            }}
                          >
                            <option value="">Pilih Bahan...</option>
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                          </select>
                          
                          <div className="flex items-center gap-2 w-32 sm:w-auto">
                            <input 
                              type="number" 
                              placeholder="Takaran" 
                              className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 text-right"
                              value={ing.qty || ''}
                              onChange={(e) => {
                                const newIngredients = [...ingredients];
                                newIngredients[index].qty = Number(e.target.value);
                                setIngredients(newIngredients);
                              }}
                            />
                            <span className="text-xs font-semibold text-slate-500 w-8">{baseUnit}</span>
                          </div>

                          <div className="w-24 text-right flex-shrink-0">
                            <span className="text-sm font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => {
                              const newIngredients = ingredients.filter((_, i) => i !== index);
                              setIngredients(newIngredients);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent flex-shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}

                  <button 
                    type="button"
                    onClick={() => setIngredients([...ingredients, { id: Date.now(), inventoryId: "", qty: 0 }])}
                    className="mt-2 text-sm font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition-colors"
                  >
                    <Plus size={16} /> Tambah Bahan
                  </button>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Harga Jual</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                    value={formData.price || ''} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} placeholder="0" />
                </div>

                <div className="col-span-2 my-1">
                   <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                     <div>
                       <span className="text-sm font-semibold text-slate-700 block">Margin Profit:</span>
                       <span className="text-[11px] text-slate-500 font-medium">Harga Jual - Total HPP</span>
                     </div>
                     <div className="text-right">
                       <p className={`text-lg font-bold flex items-center justify-end gap-2 ${marginRp > 0 ? 'text-emerald-500' : marginRp < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                         <span>{formatCurrency(marginRp)}</span>
                         {marginPct > 0 && (
                           <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">
                             {marginPct.toFixed(0)}%
                           </span>
                         )}
                         {marginPct <= 0 && formData.hpp > 0 && (
                           <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-bold">
                             {marginPct.toFixed(0)}%
                           </span>
                         )}
                       </p>
                     </div>
                   </div>
                </div>
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
                onClick={attemptSave}
                disabled={!formData.name || !formData.price || !formData.category}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {modalMode === "ADD" ? "Simpan Produk" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal === "SAVE" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Simpan Perubahan?</h3>
              <p className="text-slate-500 text-sm">Apakah Anda yakin ingin menyimpan produk <span className="font-bold text-slate-700">{formData.name}</span>?</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                Batal
              </button>
              <button onClick={executeSave} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm">
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal === "DELETE" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-rose-50">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Hapus Produk?</h3>
              <p className="text-slate-500 text-sm">Apakah Anda yakin ingin menghapus produk <span className="font-bold text-slate-700">{selectedProduct?.name}</span>? Resep terkait juga akan ikut dihapus secara permanen.</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button onClick={() => setConfirmModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                Batal
              </button>
              <button onClick={executeDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sm">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
