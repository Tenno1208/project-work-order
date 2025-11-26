"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ npp: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success && data.token) {
      // ✅ Simpan token di localStorage
      localStorage.setItem("token", data.token);

      alert("Login berhasil!");
      router.push("/dashboard");
    } else {
      alert(data.message || "Login gagal");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg p-8 rounded-3xl w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">
          Login PDAM
        </h2>

        <input
          type="text"
          placeholder="NPP"
          className="w-full p-3 border rounded-xl mb-3"
          onChange={(e) => setForm({ ...form, npp: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded-xl mb-4"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition"
          disabled={loading}
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
