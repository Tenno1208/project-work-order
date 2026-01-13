"use client";

import { useState } from "react";
import { User, Lock, Eye, EyeOff, Loader2, Zap, AlertCircle, Wifi, WifiOff } from "lucide-react";

// --- KONFIGURASI API MENGGUNAKAN ENV ---
const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_PORTAL_PEGAWAI;
const WORKORDER_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface UserData { 
    nama: string; 
    npp: string; 
    no_telp: string; 
    satker: string; 
    subsatker: string; 
    jabatan: string;
    alamat: string;    
    kdparent: string; 
    role_cabang: string;
}

enum ErrorType {
  NETWORK = "network",
  SERVER = "server",
  AUTH = "auth",
  VALIDATION = "validation",
  UNKNOWN = "unknown"
}

export default function LoginPage() {
  const [npp, setNpp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<ErrorType>(ErrorType.UNKNOWN);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");

  if (!PORTAL_BASE_URL || !WORKORDER_BASE_URL) {
      console.error("ENV Variables belum di-set!");
  }

  const isNetworkError = (err: any) => {
    return err instanceof TypeError && err.message.includes('fetch');
  };

  const handleApiError = (err: any, defaultMessage: string = "Terjadi kesalahan tak terduga.") => {
    console.error("API Error Detail:", err);
    
    if (isNetworkError(err)) {
      setErrorType(ErrorType.NETWORK);
      return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
    }
    
    if (err.status) {
      switch (err.status) {
        case 400:
          setErrorType(ErrorType.VALIDATION);
          return "NPP atau Password salah";
        case 401:
        case 403:
          setErrorType(ErrorType.AUTH);
          return "Akses ditolak (Unauthorized). Cek NPP/Password atau Hak Akses.";
        case 404:
             return "Endpoint tidak ditemukan (404). Cek URL API.";
        case 500:
        case 502:
        case 503:
        case 504:
          setErrorType(ErrorType.SERVER);
          return "Server sedang bermasalah. Silakan coba lagi nanti.";
        default:
          setErrorType(ErrorType.UNKNOWN);
          return err.message || defaultMessage;
      }
    }
    
    setErrorType(ErrorType.UNKNOWN);
    return err.message || defaultMessage;
  };

  const fetchAndStoreUserData = async (token: string): Promise<UserData> => {
      const meUrl = `${PORTAL_BASE_URL}/auth/me`;
      console.log("Fetching User Data from:", meUrl);

      try {
          const res = await fetch(meUrl, {
              method: "GET",
              headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
              },
          });

          if (!res.ok) {
              throw new Error(`Gagal mengambil profil user. Status: ${res.status}`);
          }

          const json = await res.json();
          
          // --- LOGIKA MAPPING SESUAI PROXY ---
          const user = json?.data?.user || {};
          const pegawai = user?.rl_pegawai || {};
          const idsatker = user?.rl_satker || {};

          let rawPhone = pegawai.tlp || "-";

          const formattedPhone = rawPhone.replace(/^(\+62)/, "0");

          const userProfile: UserData = {
              nama: user.name || "-",
              npp: user.npp || "-",
              no_telp: formattedPhone,
              satker: pegawai.satker || "-",
              subsatker: pegawai.subsatker || "-",
              alamat: pegawai.alamat || "-",
              kdparent: idsatker.kd_parent || "-",
              jabatan: pegawai.jabatan || "-",
              role_cabang: user.role_cabang || "0" 
          };

          localStorage.setItem("user_data", JSON.stringify(userProfile));
          return userProfile;

      } catch (err) {
          console.error("Error fetching /auth/me:", err);
          throw err;
      }
  };

  const fetchAndStorePermissions = async (token: string, userNpp: string): Promise<string[]> => { 
      const finalPermissionsApiUrl = `${PORTAL_BASE_URL}/auth/permission-names`;
      
      try {
          const res = await fetch(finalPermissionsApiUrl, { 
              method: "GET", 
              headers: { 
                  Authorization: `Bearer ${token}`, 
                  "Content-Type": "application/json", 
              } 
          });
          
          if (!res.ok) { 
              if (res.status === 401) throw new Error("Token tidak valid (401).");
              return []; 
          }
          
          const json = await res.json();
          const rawPermissions = (json.data && Array.isArray(json.data.permissions)) 
              ? json.data.permissions 
              : (Array.isArray(json.data) ? json.data : []);
              
          const permissions: string[] = rawPermissions.map((p: any) => typeof p === 'string' ? p : '').filter(Boolean);
          
          localStorage.setItem("user_permissions", JSON.stringify(permissions));
          return permissions;
      } catch (err) { 
          console.error("Permission Fetch Error:", err);
          return []; 
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError("");
    if (!npp || !password) { setError("NPP dan Password wajib diisi"); return; }

    setLoading(true);
    try {
      const loginUrl = `${PORTAL_BASE_URL}/auth/login`;
      console.log("Attempting login to:", loginUrl);

      const formData = new URLSearchParams();
      formData.append("npp", npp);
      formData.append("password", password);
      formData.append("hwid", "prod");

      // 1. LOGIN REQUEST
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(), 
      });

      const text = await response.text();
      let responseData;
      try {
          responseData = text ? JSON.parse(text) : {};
      } catch(e) {
          throw new Error("Respon server tidak valid (bukan JSON).");
      }

      if (!response.ok) {
        throw new Error(handleApiError({ status: response.status, message: responseData.message }, "Login gagal."));
      }

      // Ambil token
      const token = responseData?.data?.access_token;
      
      if (!token) {
          throw new Error("Login sukses, tapi Token tidak ditemukan.");
      }

      // Simpan Token
      localStorage.setItem("token", token);
      
      try {
        const userData = await fetchAndStoreUserData(token);
        
        // 3. Ambil Permissions
        let permissions: string[] = [];
        if (userData.npp && userData.npp !== '-') {
          permissions = await fetchAndStorePermissions(token, userData.npp);
        }
        
        if (!permissions || permissions.length === 0) {
            console.error("Warning: Permissions kosong.");
            throw new Error("Gagal mengambil data hak akses (Permissions).");
        }

        const hasDashboardAccess = permissions.includes('workorder-pti.view.dashboard');
        
        if (!hasDashboardAccess) {
             throw new Error("Anda tidak memiliki izin 'workorder-pti.view.dashboard'. Akses ditolak.");
        }

        setTimeout(() => window.location.href = "/dashboard", 500);
        
      } catch (apiError: any) {
        throw apiError;
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case ErrorType.NETWORK: return <WifiOff className="w-5 h-5 mt-0.5 flex-shrink-0" />;
      case ErrorType.SERVER: return <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />;
      case ErrorType.AUTH:
      case ErrorType.VALIDATION: return <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />;
      default: return <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />;
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case ErrorType.NETWORK: return "bg-orange-500/10 border-orange-500/30 text-orange-300";
      case ErrorType.SERVER: return "bg-red-500/10 border-red-500/30 text-red-300";
      case ErrorType.AUTH:
      case ErrorType.VALIDATION: return "bg-yellow-500/10 border-yellow-500/30 text-yellow-300";
      default: return "bg-red-500/10 border-red-500/30 text-red-300";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Background & Animation Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}></div>
      </div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-blue-500/20 relative">
          
          {/* Header */}
          <div className="relative p-6 text-center">
            <img src="/pdam.png" alt="PDAM Logo" className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg shadow-blue-500/50" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent mb-1">
              PDAM Portal
            </h1>
            <p className="text-blue-300/80 text-xs flex items-center justify-center gap-2">
              <Zap className="w-3 h-3" /> Sistem Manajemen Work Order
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 pt-4 relative z-10">
            {error && (
              <div className={`${getErrorColor()} p-4 rounded-xl mb-6 flex items-start gap-3 animate-shake`}>
                {getErrorIcon()}
                <div className="flex-1">
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* NPP Input */}
            <div className="mb-6 group">
              <label className="block text-blue-300 font-medium mb-2 text-sm">NPP</label>
              <div className="relative">
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 transition-opacity duration-300 ${focusedInput === 'npp' ? 'opacity-100' : 'opacity-0'}`}></div>
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedInput === 'npp' ? 'text-blue-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:border-blue-500/50 focus:bg-slate-700/70 outline-none transition-all text-white placeholder-slate-400 relative z-10 backdrop-blur-sm"
                  placeholder="Masukkan NPP Anda"
                  value={npp}
                  onChange={(e) => setNpp(e.target.value)}
                  onFocus={() => setFocusedInput('npp')}
                  onBlur={() => setFocusedInput('')}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-6 group">
              <label className="block text-blue-300 font-medium mb-1.5 text-xs">Password</label>
              <div className="relative">
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 transition-opacity duration-300 ${focusedInput === 'password' ? 'opacity-100' : 'opacity-0'}`}></div>
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${focusedInput === 'password' ? 'text-blue-400' : 'text-slate-500'}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-xl focus:border-blue-500/50 focus:bg-slate-700/70 outline-none transition-all text-white text-sm placeholder-slate-400 relative z-10 backdrop-blur-sm"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput('')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                  <span className="relative z-10">Memproses...</span>
                </>
              ) : (
                <span className="relative z-10">Masuk ke Sistem</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pb-6 px-6 relative z-10">
            <p className="text-xs text-slate-400">
              Belum punya akun? <span className="text-blue-400 cursor-pointer">Hubungi Administrator</span>
            </p>
          </div>
        </div>
        <p className="text-center mt-4 text-xs text-slate-500">© 2025 PDAM Kota Semarang.</p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}