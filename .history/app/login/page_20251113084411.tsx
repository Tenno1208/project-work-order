"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, IdCard, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

      // Sedikit delay agar animasi terasa halus
      setTimeout(() => router.push("/dashboard"), 800);
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

      <motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
  className="w-full max-w-sm relative z-10" // <- max-w-md diganti max-w-sm supaya lebih kecil
>
  <div className="bg-white rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm bg-opacity-95">
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center relative"> {/* p-8 -> p-6 */}
      <div className="absolute inset-0 bg-blue-800 opacity-10"></div>
      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-3 shadow-md" // w-20 -> w-16, h-20 -> h-16, mb-4 -> mb-3
        >
          <Droplets className="w-8 h-8 text-blue-600" /> {/* w-10 -> w-8 */}
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-1">PDAM Portal</h1> {/* text-3xl -> text-2xl, mb-2 -> mb-1 */}
        <p className="text-blue-100 text-sm">Sistem Manajemen Work Order</p> {/* text-base -> text-sm */}
      </div>
    </div>

    {/* Form */}
    <form onSubmit={handleLogin} className="p-6"> {/* p-8 -> p-6 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-lg mb-5 flex items-start gap-2" // padding dikurangi
          >
            <svg
              className="w-5 h-5 mt-0.5 flex-shrink-0"
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
            <span className="text-sm">{error}</span> {/* text-base -> text-sm */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NPP */}
      <div className="mb-4"> {/* mb-5 -> mb-4 */}
        <label className="block text-gray-700 font-medium mb-1 text-sm"> {/* text-base -> text-sm, mb-2 -> mb-1 */}
          NPP
        </label>
        <div className="relative">
          <IdCard className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /> {/* dikurangi */}
          <input
            type="text"
            className="w-full pl-12 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm placeholder-gray-600" // padding & text-sm
            placeholder="Masukkan NPP Anda"
            value={npp}
            onChange={(e) => setNpp(e.target.value)}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-5"> {/* mb-6 -> mb-5 */}
        <label className="block text-gray-700 font-medium mb-1 text-sm">Password</label>
        <div className="relative">
          <Lock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type={showPassword ? "text" : "password"}
            className="w-full pl-12 pr-12 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm placeholder-gray-600"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tombol Login */}
      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> {/* w-5 -> w-4 */}
            <span>Memproses...</span>
          </>
        ) : (
          "Masuk"
        )}
      </motion.button>
    </form>

    {/* Footer */}
    <div className="text-center mt-3 mb-4">
      <p className="text-sm text-gray-500">
        Belum punya akun?{" "}
        <button type="button" className="text-blue-600 hover:text-blue-700 font-medium">
          Hubungi Administrator
        </button>
      </p>
    </div>
  </div>

  <p className="text-center mt-4 text-sm text-gray-500">© 2025 PDAM Kota Semarang. All rights reserved.</p>
</motion.div>

    </div>
  );
}
