"use client";

import { useState } from "react";
import { Droplets, User, Lock, Eye, EyeOff, Loader2, Zap, AlertCircle, Wifi, WifiOff } from "lucide-react";

const PERMISSIONS_API_LOCAL_PROXY = "/api/permissions";

interface UserData { 
    nama?: string; 
    npp?: string; 
    no_telp?: string; 
    satker?: string; 
    subsatker?: string; 
    kdparent: string | number;
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
  const [isOnline, setIsOnline] = useState(true);

  const getToken = () => localStorage.getItem("token");

  const isNetworkError = (err: any) => {
    return err instanceof TypeError && err.message.includes('fetch');
  };

  const handleApiError = (err: any, defaultMessage: string = "Terjadi kesalahan tak terduga.") => {
    console.error("API Error:", err);
    
    if (isNetworkError(err)) {
      setErrorType(ErrorType.NETWORK);
      return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.";
    }
    
    if (err.status) {
      switch (err.status) {
        case 400:
          setErrorType(ErrorType.VALIDATION);
          return "Data yang dimasukkan tidak valid. Silakan periksa kembali.";
        case 401:
        case 403:
          setErrorType(ErrorType.AUTH);
          return "Autentikasi gagal. NPP atau password salah.";
        case 500:
        case 502:
        case 503:
        case 504:
          setErrorType(ErrorType.SERVER);
          return "Server sedang bermasalah. Silakan coba lagi beberapa saat.";
        default:
          setErrorType(ErrorType.UNKNOWN);
          return err.message || defaultMessage;
      }
    }
    
    setErrorType(ErrorType.UNKNOWN);
    return err.message || defaultMessage;
  };

  // --- API CALLS ---
  const fetchAndStoreUserData = async (token: string): Promise<UserData> => {   
      try {
          const res = await fetch("/api/me", { 
              method: "GET", 
              headers: { 
                  Authorization: `Bearer ${token}`, 
                  "Content-Type": "application/json", 
              } 
          });
          
          if (!res.ok) { 
              if (res.status === 401 || res.status === 403) { 
                  localStorage.removeItem("token"); 
                  localStorage.removeItem("user_data"); 
                  localStorage.removeItem("user_permissions"); 
                  window.location.href = "/login"; 
              } 
              throw new Error(handleApiError({ status: res.status }, "Gagal mengambil data pengguna"));
          }
          
          const flatUserData = await res.json();
          const userProfile: UserData = { 
              nama: flatUserData.nama || "Tanpa Nama", 
              npp: flatUserData.npp || "-", 
              no_telp: flatUserData.no_telp || "-", 
              satker: flatUserData.satker || "-", 
              subsatker: flatUserData.subsatker || "-", 
              kdparent: flatUserData.kdparent || "-",
          };
          localStorage.setItem("user_data", JSON.stringify(userProfile));
          return userProfile;
      } catch (err) { 
          const errorMessage = handleApiError(err, "Gagal mengambil data pengguna");
          setError(errorMessage);
          throw new Error(errorMessage);
      }
  };

  const fetchAndStorePermissions = async (token: string,): Promise<string[]> => { 
      const finalPermissionsApiUrl = `${PERMISSIONS_API_LOCAL_PROXY}`;
      try {
          const res = await fetch(finalPermissionsApiUrl, { 
              method: "GET", 
              headers: { 
                  Authorization: `Bearer ${token}`, 
                  "Content-Type": "application/json", 
              } 
          });
          
          if (!res.ok) { 
              localStorage.setItem("user_permissions", JSON.stringify([])); 
              throw new Error(handleApiError({ status: res.status }, "Gagal mengambil izin akses"));
          }
          
          const json = await res.json();
          const rawPermissions = (json.data && Array.isArray(json.data.permissions)) ? json.data.permissions : [];
          const permissions: string[] = rawPermissions.map((p: any) => typeof p === 'string' ? p : '').filter(Boolean);
          localStorage.setItem("user_permissions", JSON.stringify(permissions));
          return permissions;
      } catch (err) { 
          const errorMessage = handleApiError(err, "Gagal mengambil izin akses");
          setError(errorMessage);
          localStorage.setItem("user_permissions", JSON.stringify([])); 
          throw new Error(errorMessage);
      }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setError("");
    setErrorType(ErrorType.UNKNOWN);

    if (!npp || !password) {
      setError("NPP dan password wajib diisi.");
      setErrorType(ErrorType.VALIDATION);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npp, password, hwid: "prod" }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(handleApiError({ status: response.status, message: data.message }, "Login gagal. Silakan coba lagi."));
      }

      const token = data?.token;
      if (!token) throw new Error("Token tidak ditemukan di server.");

      localStorage.setItem("token", token);
      
      try {
        const userData = await fetchAndStoreUserData(token);
        if (userData.npp && userData.npp !== '-') {
          await fetchAndStorePermissions(token, userData.npp);
        }
        
        setTimeout(() => window.location.href = "/dashboard", 800);
      } catch (apiError) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_data");
        localStorage.removeItem("user_permissions");
        throw apiError;
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setLoading(false);
    }
  };

  const getErrorIcon = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return <WifiOff className="w-5 h-5 mt-0.5 flex-shrink-0" />;
      case ErrorType.SERVER:
        return <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />;
      case ErrorType.AUTH:
      case ErrorType.VALIDATION:
        return <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />;
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return "bg-orange-500/10 border-orange-500/30 text-orange-300";
      case ErrorType.SERVER:
        return "bg-red-500/10 border-red-500/30 text-red-300";
      case ErrorType.AUTH:
      case ErrorType.VALIDATION:
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-300";
      default:
        return "bg-red-500/10 border-red-500/30 text-red-300";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }}></div>
      </div>

      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-blue-500/20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none"></div>
          
          <div className="absolute inset-0 rounded-3xl opacity-50 pointer-events-none" style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.3), transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'borderGlow 3s ease infinite'
          }}></div>

          {/* Header */}
          <div className="relative p-6 text-center">
            <img src="/pdam.png" alt="PDAM Logo" className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg shadow-blue-500/50" />
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent mb-1 tracking-tight">
              PDAM Portal
            </h1>
            <p className="text-blue-300/80 text-xs flex items-center justify-center gap-2">
              <Zap className="w-3 h-3" />
              Sistem Manajemen Work Order
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 pt-4 relative z-10">
            {error && (
              <div className={`${getErrorColor()} p-4 rounded-xl mb-6 flex items-start gap-3 animate-shake`}>
                {getErrorIcon()}
                <div className="flex-1">
                  <span className="text-sm font-medium">{error}</span>
                  {errorType === ErrorType.NETWORK && (
                    <p className="text-xs mt-1 opacity-80">
                      Pastikan Anda terhubung ke internet dan server dapat diakses.
                    </p>
                  )}
                  {errorType === ErrorType.SERVER && (
                    <p className="text-xs mt-1 opacity-80">
                      Server sedang mengalami masalah. Silakan coba lagi dalam beberapa saat.
                    </p>
                  )}
                  {errorType === ErrorType.AUTH && (
                    <p className="text-xs mt-1 opacity-80">
                      Periksa kembali NPP dan password Anda.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* NPP Input */}
            <div className="mb-6 group">
              <label className="block text-blue-300 font-medium mb-2 text-sm">
                NPP
              </label>
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
              <label className="block text-blue-300 font-medium mb-1.5 text-xs">
                Password
              </label>
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
                  type="button" // Tetap type="button" agar tidak memicu submit form
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                  <span className="relative z-10">Memproses...</span>
                </>
              ) : (
                <span className="relative z-10">Masuk ke Sistem</span>
              )}
            </button>
          {/* PERUBAHAN 3: Menutup tag <form> */}
          </form>

          {/* Footer */}
          <div className="text-center pb-6 px-6 relative z-10">
            <p className="text-xs text-slate-400">
              Belum punya akun?{" "}
              <button type="button" className="text-blue-400 hover:text-cyan-400 font-medium transition-colors">
                Hubungi Administrator
              </button>
            </p>
          </div>
        </div>

        <p className="text-center mt-4 text-xs text-slate-500">
          © 2025 PDAM Kota Semarang. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes borderGlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}