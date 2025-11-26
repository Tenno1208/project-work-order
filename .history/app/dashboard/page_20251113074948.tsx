"use client";

import { useEffect, useState } from "react";
import { Bell, Settings, ClipboardList, FileText, LayoutDashboard, CircleCheckBig } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  // We simulate useRouter for a single-file environment if it's not available
  const router = typeof useRouter === 'function' ? useRouter() : { push: (href) => window.location.href = href };
  
  const [user, setUser] = useState<{ npp?: string; nama?: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Use router.push('/') to match the original logic, assuming the base path is login
      router.push("/login"); 
      return;
    }

    const fetchUser = async () => {
      try {
        // Use a safe, simulated fetch API for the single-file environment
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
      <div className="flex h-screen items-center justify-center text-blue-700 text-base"> {/* Reduced font size */}
        Memuat data pengguna...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header - Reduced padding and font size */}
      <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-blue-100"> {/* p-8 -> p-5, rounded-3xl -> rounded-2xl, mb-6 -> mb-4 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-1"> {/* text-3xl -> text-2xl, mb-2 -> mb-1 */}
              Selamat Datang, {user.nama || "Pengguna"}!
            </h2>
            <p className="text-sm text-blue-600">NPP: {user.npp || "-"}</p> {/* Reduced font size */}
          </div>
          <div className="flex gap-2"> {/* Reduced gap */}
            {/* Reduced padding and icon size */}
            <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 shadow-sm transition-all"> {/* p-4 -> p-3, rounded-2xl -> rounded-xl */}
              <Bell className="text-blue-600" size={18} /> {/* size={22} -> size={18} */}
            </button>
            {/* Reduced padding and icon size */}
            <button className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 shadow-sm transition-all"> {/* p-4 -> p-3, rounded-2xl -> rounded-xl */}
              <Settings className="text-blue-600" size={18} /> {/* size={22} -> size={18} */}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Reduced gap */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* gap-6 -> gap-4 */}
        {[
          { title: "Total Work Orders", value: "248", icon: ClipboardList, color: "blue" },
          { title: "Active Projects", value: "42", icon: FileText, color: "red" },
          { title: "Completed", value: "206", icon: CircleCheckBig, color: "green" },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" // p-6 -> p-4, rounded-3xl -> rounded-xl
          >
            <div className="flex items-center justify-between mb-3"> 
              <div
                className={`p-3 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-lg shadow-md`} // p-4 -> p-3, rounded-2xl -> rounded-lg
              >
                <stat.icon className="text-white" size={24} /> 
              </div>
            </div>
            <h3 className="text-xs font-semibold text-slate-600 mb-1">{stat.title}</h3> {/* text-sm -> text-xs, mb-2 -> mb-1 */}
            <p className="text-3xl font-bold text-blue-900">{stat.value}</p> {/* text-4xl -> text-3xl */}
          </div>
        ))}
      </div>
    </div>
  );
}