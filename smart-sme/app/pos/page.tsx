"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext, Product, TransactionItem, getProductStock } from "../context/AppContext";
import { Search, Plus, Minus, ShoppingCart, Coffee, Box, Trash2, CheckCircle2 } from "lucide-react";

export default function POSPage() {
  const { products, setProducts, transactions, setTransactions, role, inventory, setInventory } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (role === "Staf") router.push("/reimburse");
  }, [role, router]);

  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [showToast, setShowToast] = useState(false);

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

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const newTransaction = {
      id: `TRX-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString(),
      total: subtotal,
      profit: totalProfit,
      status: "Success" as const,
      items: [...cart],
    };

    setTransactions([newTransaction, ...transactions]);
    
    const updatedInventory = [...inventory];
    cart.forEach(cartItem => {
      if (cartItem.product.recipe) {
        cartItem.product.recipe.forEach(recipeItem => {
          const invItemFound = updatedInventory.find(i => i.id === recipeItem.inventoryId);
          if (invItemFound) {
            let usedQty = recipeItem.qty * cartItem.quantity;
            if (invItemFound.unit === 'kg' || invItemFound.unit === 'Liter') {
              usedQty = usedQty / 1000;
            }
            invItemFound.stock -= usedQty;
          }
        });
      }
    });
    setInventory(updatedInventory);
    
    setCart([]);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 relative animate-in fade-in duration-500">
      {showToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 shadow-xl rounded-xl p-4 flex items-center gap-3 animate-bounce border border-emerald-500">
          <CheckCircle2 className="text-white" size={24} />
          <div>
            <p className="font-bold text-white">Pembayaran Berhasil!</p>
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
              const displayStock = stock === 999 ? '∞' : stock;
              
              return (
              <div 
                key={p.id} 
                onClick={() => addToCart(p)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                  isAvailable
                  ? "border-slate-200 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 group" 
                  : "border-slate-200 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-indigo-600 transition-colors border border-slate-100 group-hover:bg-indigo-50">
                  {p.icon === "Coffee" ? <Coffee size={32} /> : <Box size={32} />}
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{p.name}</h3>
                <p className="text-slate-600 font-bold text-sm mt-1">{formatCurrency(p.price)}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${stock < 10 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    Stok: {displayStock}
                  </span>
                  {isAvailable && (
                    <button className="bg-slate-100 text-slate-600 p-1.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-200 group-hover:border-indigo-600 shadow-sm">
                      <Plus size={14} />
                    </button>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Subtotal Omzet</span>
              <span className="font-bold text-slate-900 text-lg">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-dashed border-slate-300">
              <span className="text-emerald-600 font-semibold">Estimasi Margin Profit</span>
              <span className="font-bold text-emerald-600">+{formatCurrency(totalProfit)}</span>
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
