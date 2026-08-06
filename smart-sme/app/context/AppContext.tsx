"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "Owner" | "Kasir" | "Staf";

export type Product = {
  id: string;
  name: string;
  category: string;
  hpp: number;
  price: number;
  stock: number;
  icon?: string;
};

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
  
  totalOmzet: number;
  totalProfit: number;
  totalPengeluaran: number;
  netProfit: number;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Owner");
  
  const [products, setProducts] = useState<Product[]>([
    { id: "P1", name: "Kopi Hitam", category: "Minuman", hpp: 5000, price: 15000, stock: 45, icon: "Coffee" },
    { id: "P2", name: "Latte Ice", category: "Minuman", hpp: 8000, price: 25000, stock: 5, icon: "Coffee" },
    { id: "P3", name: "Roti Bakar Coklat", category: "Makanan", hpp: 6000, price: 18000, stock: 12, icon: "Box" },
    { id: "P4", name: "Kentang Goreng", category: "Makanan", hpp: 8000, price: 20000, stock: 8, icon: "Box" },
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
