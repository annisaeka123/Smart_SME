"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAppContext } from "../context/AppContext";
import { Loader2 } from "lucide-react";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { session, isLoadingSession, role } = useAppContext();

  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (!isLoadingSession) {
      if (!session && !isAuthPage) {
        router.push("/login"); // Belum login, ke halaman terlarang -> login
      } else if (session) {
        if (isAuthPage) {
          if (role === "Owner") router.push("/dashboard");
          else if (role === "Kasir") router.push("/pos");
          else router.push("/reimburse");
        } else if (role === "Kasir" && pathname !== "/pos") {
          router.push("/pos"); 
        } else if (role === "Staf" && pathname !== "/reimburse") {
          router.push("/reimburse");
        }
      }
    }
  }, [session, isLoadingSession, isAuthPage, pathname, router, role]);

  if (isLoadingSession) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-violet-600" size={40} />
      </div>
    );
  }

  if (isAuthPage) {
    return <div className="h-screen w-full">{children}</div>;
  }

  if (!session) return null; // Wait for redirect

  return (
    <div className="flex h-screen w-full bg-white text-slate-800 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAFBFF]">
        <Header toggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
