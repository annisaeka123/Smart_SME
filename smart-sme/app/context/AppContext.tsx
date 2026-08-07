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
  date?: string;
  created_at?: string;
  thumbnail?: string;
  title: string;
  amount: number;
  category?: string;
  notes?: string;
  receipt_url?: string;
  status: "pending" | "approved" | "rejected" | "Pending" | "Approved" | "Rejected";
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
  
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);

  const totalOmzet = transactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = transactions.reduce((acc, curr) => acc + curr.profit, 0);
  const totalPengeluaran = reimbursements.filter(r => (r.status || "").toLowerCase() === "approved").reduce((acc, curr) => acc + curr.amount, 0);
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
