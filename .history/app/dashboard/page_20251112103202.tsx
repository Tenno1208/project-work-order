"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, ClipboardList, FileText, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<{ npp?: string; nama?: string }>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/"); 
      return;
    }

    const fetchUser = async () => {
  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data);
    } else {
      console.error("Gagal ambil profil:", data);
    }
  } catch (err) {
    console.error("Error fetch /me:", err);
  } finally {
    setLoading(false);
  }
};

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-blue-700 text-xl">
        Memuat data pengguna...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg p-8 mb-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-blue-900 mb-2">
              Selamat Datang, {user.nama || "Pengguna"}!
            </h2>
            <p className="text-blue-600">NPP: {user.npp || "-"}</p>
          </div>
          <div className="flex gap-3">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-200 shadow-sm">
              <Bell className="text-blue-600" size={22} />
            </button>
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-200 shadow-sm">
              <Settings className="text-blue-600" size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Total Work Orders", value: "248", icon: ClipboardList, color: "blue" },
          { title: "Active Projects", value: "42", icon: FileText, color: "green" },
          { title: "Completed", value: "206", icon: , color: "purple" },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-3xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-4 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-2xl shadow-lg`}
              >
                <stat.icon className="text-white" size={28} />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2">{stat.title}</h3>
            <p className="text-4xl font-bold text-blue-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
