"use client";

import { useState } from "react";
import { Droplets, User, Lock, Eye, EyeOff, Loader2, Zap } from "lucide-react";

export default function LoginPage() {
  const [npp, setNpp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!npp || !password) {
      setError("NPP dan password wajib diisi.");
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
        throw new Error(data.message || "Login gagal. Silakan coba lagi.");
      }

      const token = data?.token;
      if (!token) throw new Error("Token tidak ditemukan di server.");

      localStorage.setItem("token", token);
      setTimeout(() => window.location.href = "/dashboard", 800);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }}></div>
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-slate-800/40 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-blue-500/20 relative">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none"></div>
          
          {/* Animated Border */}
          <div className="absolute inset-0 rounded-3xl opacity-50 pointer-events-none" style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.3), transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'borderGlow 3s ease infinite'
          }}></div>

          {/* Header */}
          <div className="relative p-6 text-center">
            {/* Ganti komentar di bawah dengan logo Anda */}
            {/* Cara 1: Jika logo sudah di folder public */}
            <img src="/pdam.png" alt="PDAM Logo" className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg shadow-blue-500/50" />
            
            {/* Cara 2: Import di komponen (uncomment baris di bawah dan comment icon Droplets) */}
            {/* import LogoPDAM from '@/public/logo-pdam.png' atau dari path lain */}
            {/* <img src={LogoPDAM.src} alt="PDAM Logo" className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg shadow-blue-500/50" /> */}
            
            {/* Icon Default (hapus jika sudah pakai logo) */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-3 shadow-lg shadow-blue-500/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <Droplets className="w-8 h-8 text-white relative z-10" />
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent mb-1 tracking-tight">
              PDAM Portal
            </h1>
            <p className="text-blue-300/80 text-xs flex items-center justify-center gap-2">
              <Zap className="w-3 h-3" />
              Sistem Manajemen Work Order
            </p>
          </div>

          {/* Form */}
          <div className="p-8 pt-4 relative z-10">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-sm text-red-300 p-4 rounded-xl mb-6 flex items-start gap-3 animate-shake">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
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
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleLogin}
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
          </div>

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