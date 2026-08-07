"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "Owner" | "Kasir" | "Staf";

export type Product = {
  id: string;
  name: string;
  category: string;
  hpp: number;
  price: number;
  recipe?: { inventoryId: string, qty: number }[];
  icon?: string;
};

export type Ingredient = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  price: number;
};

export function getProductStock(product: Product, inventory: Ingredient[]): number {
  if (!product.recipe || product.recipe.length === 0) return 0;
  let maxPortions = Infinity;
  for (const item of product.recipe) {
    const invItem = inventory.find(i => i.id === item.inventoryId);
    if (!invItem) return 0;
    
    let availableBaseUnits = invItem.stock;
    if (invItem.unit === 'kg' || invItem.unit === 'Liter') {
      availableBaseUnits = invItem.stock * 1000;
    }
    const possiblePortions = Math.floor(availableBaseUnits / item.qty);
    if (possiblePortions < maxPortions) {
      maxPortions = possiblePortions;
    }
  }
  return maxPortions === Infinity ? 0 : maxPortions;
}

export type TransactionItem = {
  product: Product;
  quantity: number;
};

export type Transaction = {
  id: string;
  date: string;
  total: number;
  profit: number;
  status: "Success" | "Pending" | "Failed";
  items: TransactionItem[];
};

export type Reimbursement = {
  id: string;
  date: string;
  thumbnail: string;
  title: string;
  amount: number;
  status: "Pending" | "Approved" | "Rejected";
};

type AppContextType = {
  role: Role;
  setRole: React.Dispatch<React.SetStateAction<Role>>;
  
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  
  reimbursements: Reimbursement[];
  setReimbursements: React.Dispatch<React.SetStateAction<Reimbursement[]>>;

  inventory: Ingredient[];
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  
  totalOmzet: number;
  totalProfit: number;
  totalPengeluaran: number;
  netProfit: number;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Owner");
  
  const [products, setProducts] = useState<Product[]>([
    { id: "P1", name: "Kopi Hitam", category: "Minuman", hpp: 3200, price: 15000, icon: "Coffee", recipe: [{ inventoryId: 'INV-1', qty: 15 }, { inventoryId: 'INV-3', qty: 20 }, { inventoryId: 'INV-4', qty: 1 }] },
    { id: "P2", name: "Latte Ice", category: "Minuman", hpp: 6200, price: 25000, icon: "Coffee", recipe: [{ inventoryId: 'INV-1', qty: 20 }, { inventoryId: 'INV-2', qty: 150 }, { inventoryId: 'INV-3', qty: 20 }, { inventoryId: 'INV-4', qty: 1 }] },
    { id: "P3", name: "Roti Bakar Coklat", category: "Makanan", hpp: 5000, price: 18000, icon: "Box", recipe: [{ inventoryId: 'INV-5', qty: 2 }, { inventoryId: 'INV-6', qty: 30 }] },
    { id: "P4", name: "Kentang Goreng", category: "Makanan", hpp: 6000, price: 20000, icon: "Box", recipe: [{ inventoryId: 'INV-7', qty: 200 }] },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "TRX-001", date: new Date().toISOString(), total: 45000, profit: 30000, status: "Success", items: [] },
    { id: "TRX-002", date: new Date(Date.now() - 3600000).toISOString(), total: 25000, profit: 17000, status: "Success", items: [] },
    { id: "TRX-003", date: new Date(Date.now() - 7200000).toISOString(), total: 35000, profit: 20000, status: "Success", items: [] },
  ]);

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([
    { id: "RMB-01", date: new Date().toISOString(), thumbnail: "📄", title: "Beli Gula & Susu", amount: 150000, status: "Pending" },
    { id: "RMB-02", date: new Date(Date.now() - 86400000).toISOString(), thumbnail: "📄", title: "Internet Bulanan", amount: 350000, status: "Approved" },
  ]);

  const [inventory, setInventory] = useState<Ingredient[]>([
    { id: "INV-1", name: "Kopi Espresso", stock: 2.5, unit: "kg", price: 120000 },
    { id: "INV-2", name: "Susu UHT", stock: 10, unit: "Liter", price: 18000 },
    { id: "INV-3", name: "Gula Aren", stock: 5, unit: "kg", price: 35000 },
    { id: "INV-4", name: "Cup Plastic", stock: 500, unit: "pcs", price: 500 },
    { id: "INV-5", name: "Roti Tawar", stock: 30, unit: "pcs", price: 2000 },
    { id: "INV-6", name: "Selai Coklat", stock: 2, unit: "kg", price: 45000 },
    { id: "INV-7", name: "Kentang Beku", stock: 5, unit: "kg", price: 30000 },
  ]);

  const totalOmzet = transactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = transactions.reduce((acc, curr) => acc + curr.profit, 0);
  const totalPengeluaran = reimbursements.filter(r => r.status === "Approved").reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalProfit - totalPengeluaran;

  return (
    <AppContext.Provider
      value={{
        role, setRole,
        products, setProducts,
        transactions, setTransactions,
        reimbursements, setReimbursements,
        inventory, setInventory,
        totalOmzet, totalProfit, totalPengeluaran, netProfit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
