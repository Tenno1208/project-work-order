"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ArrowLeft, ShieldAlert, AlertCircle, RotateCw } from "lucide-react";

// --- KONSTANTA PERMISSION ---
const ADMIN_PERMISSION = 'workorder-pti.admin';

const AccessDeniedUI = ({ missingPermission }: { missingPermission: string }) => {
  const router = useRouter();
  
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[25%] w-[30%] h-[30%] bg-blue-100/60 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[25%] w-[30%] h-[30%] bg-red-50/80 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/60 border border-white/60 p-6 md:p-8 text-center">
          
          <div className="relative inline-flex mb-5 group">
            <div className="absolute inset-0 bg-red-100 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-white to-red-50 rounded-full border border-red-100 flex items-center justify-center shadow-sm">
              <Lock className="text-red-500" size={24} strokeWidth={2.5} />
              <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                <ShieldAlert size={12} className="text-red-600" />
              </div>
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
            Akses Dibatasi
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6 px-4">
            Akun Anda tidak memiliki izin administrator untuk melihat halaman ini.
          </p>

          <div className="bg-slate-50 rounded-lg p-3 mb-6 border border-slate-100 text-left flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={14} className="text-slate-400 shrink-0" />
              <code className="text-red-600 font-mono text-xs font-semibold truncate">
                {missingPermission}
              </code>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">
              Missing
            </span>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all shadow-md shadow-slate-900/10 active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Dashboard</span>
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors py-1"
            >
              <RotateCw size={12} />
              Coba refresh halaman
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-[10px] mt-4 font-medium uppercase tracking-widest opacity-60">
          Error 403 &bull; Access Forbidden
        </p>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPermissions = localStorage.getItem('user_permissions');
      if (storedPermissions) {
        try {
          const permissions = JSON.parse(storedPermissions);
          if (Array.isArray(permissions)) {
            setUserPermissions(permissions);
          }
        } catch (e) {
          console.error("Gagal parse user_permissions:", e);
          setUserPermissions([]);
        }
      }
      setPermissionsLoaded(true);
    }
  }, []);

  if (!permissionsLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="animate-spin text-slate-900" size={32} />
        <p className="text-slate-400 text-xs font-medium animate-pulse tracking-wide">MEMVERIFIKASI AKSES...</p>
      </div>
    );
  }

  if (!userPermissions.includes(ADMIN_PERMISSION)) {
    return <AccessDeniedUI missingPermission={ADMIN_PERMISSION} />;
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Admin Dashboard
            </h1>
            <div className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">
                Super Admin Access
            </div>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-600 text-lg">
            Selamat datang, Administrator. Akses Anda telah diverifikasi.
          </p>
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <p className="text-slate-400 text-center">Area Konten Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}