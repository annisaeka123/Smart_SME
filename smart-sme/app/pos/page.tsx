"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Product, TransactionItem, getProductStock } from "../context/AppContext";
import { Search, Plus, Minus, ShoppingCart, Coffee, Box, Trash2, CheckCircle2, Pizza, Package } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function POSPage() {
  const { products, setProducts, transactions, setTransactions, role, inventory, setInventory } = useAppContext();
  const router = useRouter();

  const fetchDependencies = async () => {
    const { data: invData, error: invError } = await supabase.from("inventory").select("*");
    if (invError) console.error("Error fetching inventory:", invError.message);
    if (invData) {
      setInventory(invData.map((d: any) => ({ ...d, price: d.cost_per_unit })));
    }
    
    const { data: prodData, error: prodError } = await supabase.from("products").select("*, recipes(*)");
    if (prodError) console.error("Error fetching products:", prodError.message);
    
    if (prodData) {
      setProducts(prodData.map((p: any) => ({
        ...p,
        price: p.selling_price || p.price,
        hpp: p.base_hpp || p.hpp,
        recipe: p.recipes?.map((r: any) => ({
          inventoryId: r.inventory_id || r.inventoryId,
          qty: r.quantity_needed || r.qty
        })) || []
      })));
    }
  };

  useEffect(() => {
    if (role === "Staf") {
      router.push("/reimburse");
      return;
    }
    fetchDependencies();
  }, [role, router]);

  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'qris'|'transfer'>('cash');
  const [receiptData, setReceiptData] = useState<any>(null);

  if (role === "Staf") return null;

  const categories = ["Semua", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "Semua" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    const stock = getProductStock(product, inventory);
    if (stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stock) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const stock = getProductStock(item.product, inventory);
          const newQty = item.quantity + delta;
          if (newQty > stock) return item;
          if (newQty <= 0) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalProfit = cart.reduce((acc, item) => acc + ((item.product.price - item.product.hpp) * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const newTransaction = {
      total_price: Number(subtotal),
      total_profit: Number(totalProfit),
      payment_method: paymentMethod
    };

    const { data: trxData, error: trxError } = await supabase.from("transactions").insert(newTransaction).select().single();
    if (trxError) {
      console.error("Error inserting transaction:", trxError.message);
      alert("Error: " + trxError.message);
      return;
    }

    if (trxData) {
      const formattedTx = {
        ...trxData,
        total: trxData.total_price || trxData.total,
        profit: trxData.total_profit || trxData.profit,
        date: trxData.created_at || new Date().toISOString()
      };
      setTransactions([formattedTx as any, ...transactions]);
      setReceiptData({ ...formattedTx, cartItems: [...cart] });
    }
    
    for (const cartItem of cart) {
      if (cartItem.product.recipe) {
        for (const recipeItem of cartItem.product.recipe) {
          const invItemFound = inventory.find(i => i.id === recipeItem.inventoryId);
          if (invItemFound) {
            let usedQty = recipeItem.qty * cartItem.quantity;
            if (invItemFound.unit === 'kg' || invItemFound.unit === 'Liter') {
              usedQty = usedQty / 1000;
            }
            const sisa_stok = invItemFound.stock - usedQty;
            const { error: updateError } = await supabase.from("inventory").update({ stock: sisa_stok }).eq("id", invItemFound.id);
            if (updateError) console.error("Error updating inventory stock:", updateError.message);
          }
        }
      }
    }
    
    await fetchDependencies();
    setCart([]);
  };

  const closeReceiptModal = () => {
    setReceiptData(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 relative animate-in fade-in duration-500">
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeReceiptModal}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm relative z-10 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <div className="border-b border-dashed border-slate-300 p-6 text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Pembayaran Berhasil</h3>
              <p className="text-slate-500 text-xs font-semibold">{new Date(receiptData.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {receiptData.cartItems.map((item: any) => (
                <div key={item.product.id} className="flex justify-between items-start text-sm">
                  <div>
                    <p className="font-bold text-slate-800">{item.product.name}</p>
                    <p className="text-xs text-slate-500">{item.quantity}x @ {formatCurrency(item.product.price)}</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatCurrency(item.product.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-50 rounded-b-xl border-t border-slate-200 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Metode Pembayaran</span>
                  <span className="font-bold text-slate-900 uppercase">{receiptData.payment_method || 'CASH'}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total Transaksi</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(receiptData.total_price)}</span>
                </div>
              </div>
              <button 
                onClick={closeReceiptModal}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-lg shadow-sm transition-colors text-sm"
              >
                Tutup Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Products Grid */}
      <div className="flex-[0.65] flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-4 bg-slate-50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari produk di POS..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  activeCategory === cat 
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => {
              const stock = getProductStock(p, inventory);
              const isAvailable = stock > 0;
              const pCategory = (p.category || "").toLowerCase();
              let IconComponent = Package;
              if (pCategory.includes("makanan") || pCategory.includes("food") || pCategory.includes("snack")) {
                IconComponent = Pizza;
              } else if (pCategory.includes("minuman") || pCategory.includes("drink") || pCategory.includes("kopi")) {
                IconComponent = Coffee;
              }

              return (
              <div 
                key={p.id} 
                onClick={() => addToCart(p)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                  isAvailable
                  ? "border-slate-200 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 group flex flex-col" 
                  : "border-slate-200 opacity-50 cursor-not-allowed flex flex-col"
                }`}
              >
                <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-indigo-600 transition-colors border border-slate-100 group-hover:bg-indigo-50">
                  <IconComponent size={32} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{p.name}</h3>
                
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <p className="text-slate-600 font-bold text-sm">{formatCurrency(p.price)}</p>
                  
                  {isAvailable ? (
                    <button className="bg-slate-100 text-slate-600 p-1.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-200 group-hover:border-indigo-600 shadow-sm">
                      <Plus size={14} />
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                      Habis
                    </span>
                  )}
                </div>
              </div>
              )
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400 text-sm font-medium">
                Tidak ada produk ditemukan.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="flex-[0.35] w-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 border border-indigo-200 shadow-sm">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Keranjang Transaksi</h2>
            <p className="text-[11px] text-slate-500 font-medium">{cart.length} item(s) selected</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
              <ShoppingCart size={48} className="text-slate-200" />
              <p className="text-xs text-slate-500 font-medium">Keranjang masih kosong.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3 items-center group bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs text-slate-900 truncate">{item.product.name}</h4>
                  <p className="text-xs font-bold text-slate-600 mt-1">{formatCurrency(item.product.price)}</p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <button 
                    onClick={() => {
                      if (item.quantity === 1) removeFromCart(item.product.id);
                      else updateQuantity(item.product.id, -1);
                    }}
                    className="p-1 hover:bg-white rounded cursor-pointer text-slate-500 hover:text-slate-900 transition-colors shadow-sm bg-slate-100 border border-transparent hover:border-slate-200"
                  >
                    {item.quantity === 1 ? <Trash2 size={14} className="text-rose-500" /> : <Minus size={14} />}
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.product.id, 1)}
                    disabled={item.quantity >= getProductStock(item.product, inventory)}
                    className="p-1 hover:bg-white rounded cursor-pointer text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm bg-slate-100 border border-transparent hover:border-slate-200"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-200 space-y-4 bg-slate-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Subtotal Omzet</span>
              <span className="font-bold text-slate-900 text-lg">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-dashed border-slate-300">
              <span className="text-emerald-600 font-semibold">Estimasi Margin Profit</span>
              <span className="font-bold text-emerald-600">+{formatCurrency(totalProfit)}</span>
            </div>
            
            <div className="pt-3">
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-2">Metode Pembayaran</span>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'qris', 'transfer'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`text-[11px] font-bold py-2 rounded-md transition-all uppercase border ${
                      paymentMethod === method 
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3.5 rounded-lg font-bold text-sm shadow-sm disabled:shadow-none transition-all flex items-center justify-center gap-2 border border-transparent disabled:border-slate-300"
          >
            <ShoppingCart size={16} />
            Selesaikan Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
}
