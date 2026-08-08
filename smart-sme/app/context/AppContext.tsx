"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { Session } from "@supabase/supabase-js";

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
  session: Session | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  isLoadingSession: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Owner");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (mounted) {
            setSession(null);
            setIsLoadingSession(false);
          }
          return;
        }

        if (mounted) setSession(session);

        // Fetch or fallback role
        try {
          // Attempt fetch from profiles table just in case there is a table constraint
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role && mounted) {
            setRole(profile.role);
          } else if (session.user.user_metadata?.role && mounted) {
            setRole(session.user.user_metadata.role);
          } else if (mounted) {
            setRole("Staf");
          }
        } catch (err) {
          // Safety catch: Fallback
          if (mounted) {
            if (session.user.user_metadata?.role) setRole(session.user.user_metadata.role);
            else setRole("Staf");
          }
        }
        
      } catch (err) {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsLoadingSession(false);
      }
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) setSession(newSession);
      
      if (newSession?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', newSession.user.id)
            .single();

          if (profile?.role && mounted) {
            setRole(profile.role);
          } else if (newSession.user.user_metadata?.role && mounted) {
            setRole(newSession.user.user_metadata.role);
          } else if (mounted) {
            setRole("Staf");
          }
        } catch (err) {
          if (mounted) {
            if (newSession.user.user_metadata?.role) setRole(newSession.user.user_metadata.role);
            else setRole("Staf");
          }
        }
      } else {
        if (mounted) setIsLoadingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        session, setSession, isLoadingSession
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
