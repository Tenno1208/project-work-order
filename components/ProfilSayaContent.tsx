"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Building, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  Droplets, 
  Briefcase,
  BadgeCheck
} from 'lucide-react';

interface UserProfile {
    nama?: string;
    npp?: string;
    no_telp?: string;
    satker?: string;
    subsatker?: string;
    alamat?: string; 
}

export default function ProfilSayaContent() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getToken = () => localStorage.getItem("token");

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            const token = getToken();

            if (!token) {
                setError("Token autentikasi tidak ditemukan. Silakan login ulang.");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch("/api/me", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    throw new Error(`Gagal mengambil data: ${res.statusText}`);
                }

                const data: UserProfile = await res.json();
                setProfile(data);
            } catch (err: any) {
                setError(err.message || "Terjadi kesalahan yang tidak diketahui.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    };

    // --- Loading ---
    if (loading) {
        return (
            <div className="min-h-[300px] flex flex-col justify-center items-center p-8">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-600 mb-4" />
                <span className="text-gray-500 font-medium animate-pulse">Mengambil data profil...</span>
            </div>
        );
    }

    // --- Error ---
    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex p-3 bg-red-100 rounded-full mb-4 text-red-600">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-red-700 mb-2">Gagal Memuat Profil</h3>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    // --- Tampilan Data Profil (BERSIH - Tanpa Wrapper Card Sendiri) ---
    return (
        <div className="w-full">
            {/* PERUBAHAN UTAMA: 
               Saya menghapus background waves, padding top (pt-24), dan wrapper card putih.
               Sekarang komponen ini pas masuk ke dalam layout induknya.
            */}

            {/* Header Profile Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start p-8 pb-6 gap-6">
                {/* Avatar */}
                <div className="relative group shrink-0">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white p-1 shadow-lg ring-2 ring-blue-100">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-2xl md:text-3xl font-bold tracking-widest shadow-inner">
                            {getInitials(profile?.nama)}
                        </div>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white" title="Active"></div>
                </div>

                {/* Name & Title */}
                <div className="flex-1 text-center md:text-left mt-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">{profile?.nama || 'Pengguna'}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium border border-blue-100 flex items-center gap-1">
                            <BadgeCheck size={14} />
                            {profile?.npp ? `NPP: ${profile.npp}` : 'Pegawai'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-px bg-gray-100 mx-8"></div>

            {/* Content Grid */}
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Kolom Kiri: Informasi Kontak */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-cyan-600" />
                        <h3 className="text-base font-bold text-gray-800">Informasi Pribadi</h3>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-5">
                        <div className="flex items-start gap-4">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alamat Domisili</p>
                                <p className="text-gray-700 font-medium mt-1 leading-relaxed">
                                    {profile?.alamat || 'Belum diatur'}
                                </p>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-200"></div>

                        <div className="flex items-start gap-4">
                            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nomor Telepon</p>
                                <p className="text-gray-700 font-medium mt-1 font-mono">
                                    {profile?.no_telp || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Unit Kerja */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Building size={18} className="text-blue-600" />
                        <h3 className="text-base font-bold text-gray-800">Unit Kerja</h3>
                    </div>

                    <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 space-y-5 relative overflow-hidden">
                        <Droplets className="absolute -bottom-4 -right-4 text-blue-100 w-32 h-32 opacity-50 pointer-events-none" />
                        
                        <div className="relative z-10 flex items-start gap-4">
                            <Briefcase className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div className="w-full">
                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Satuan Kerja (Satker)</p>
                                <p className="text-gray-800 font-bold text-lg mt-1">
                                    {profile?.satker || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 w-full h-px bg-blue-200/50"></div>

                        <div className="relative z-10 flex items-start gap-4">
                            <Droplets className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Sub Satuan Kerja</p>
                                <p className="text-gray-700 font-medium mt-1">
                                    {profile?.subsatker || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}