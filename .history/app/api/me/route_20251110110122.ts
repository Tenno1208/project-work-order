"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<{ nama?: string; npp?: string }>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setUser({
            nama: data.data.nama,
            npp: data.data.npp,
          });
        }
      })
      .catch((err) => console.error("Gagal ambil data user:", err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-800">Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Selamat datang, <b>{user.nama || "Loading..."}</b> ({user.npp})
      </p>
    </div>
  );
}
