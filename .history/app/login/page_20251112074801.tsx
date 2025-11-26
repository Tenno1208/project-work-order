"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, IdCard, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [npp, setNpp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ✅ Validasi input kosong di sisi frontend
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
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 relative overflow-hidden">
      {/* Efek latar dekoratif */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm bg-opacity-95">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center relative">
            <div className="absolute inset-0 bg-blue-800 opacity-10"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
                <Droplets className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">PDAM Portal</h1>
              <p className="text-blue-100 text-sm">
                Sistem Manajemen Work Order
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-start">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 
                    1.414L8.586 10l-1.293 1.293a1 1 0 
                    101.414 1.414L10 11.414l1.293 
                    1.293a1 1 0 001.414-1.414L11.414 
                    10l1.293-1.293a1 1 0-1.414-1.414L10 
                    8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* NPP */}
<div className="mb-5">
  <label className="block text-gray-700 font-medium mb-2 text-sm">
    NPP
  </label>
  <div className="relative">
    <IdCard className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
    <input
      type="text"
      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-gray-900 placeholder-gray-600"
      placeholder="Masukkan NPP Anda"
      value={npp}
      onChange={(e) => setNpp(e.target.value)}
    />
  </div>
</div>

{/* Password */}
<div className="mb-6">
  <label className="block text-gray-700 font-medium mb-2 text-sm">
    Password
  </label>
  <div className="relative">
    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
    <input
      type={showPassword ? "text" : "password"}
      className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-gray-900 placeholder-gray-600"
      placeholder="Masukkan password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
    >
      {showPassword ? (
        <EyeOff className="w-5 h-5" />
      ) : (
        <Eye className="w-5 h-5" />
      )}
    </button>
  </div>
</div>


            {/* Tombol Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="text-center mt-4 mb-6">
            <p className="text-sm text-gray-500">
              Belum punya akun?{" "}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Hubungi Administrator
              </button>
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          © 2025 PDAM Kota Semarang. All rights reserved.
        </p>
      </div>
    </div>
  );
}
