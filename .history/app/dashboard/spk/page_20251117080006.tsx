"use client";

import React, { useEffect, useState } from "react";
import {
    FileText,
    Search,
    Loader2,
    Calendar,
    Filter,
    Pencil,
    Trash2,
    Eye,
    Plus,
    X,
    AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- KONSTANTA API ---
const GET_API_SPK_URL_LOCAL = "/api/spk/list";
const DELETE_API_SPK_URL_LOCAL = "/api/spk/delete/";

const MAX_RETRIES = 3;

// --- TYPES SESUAI API ---
type SPKItem = {
    id: number;
    nomor: string;
    pekerjaan: string;
    tanggal: string;
    status: "Selesai" | "Proses" | "Menunggu" | string;
    uuid: string;
};

export default function DaftarSPKPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [spks, setSpks] = useState<SPKItem[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [error, setError] = useState<string | null>(null);

    // --- LOADING DELETE ---
    const [deleting, setDeleting] = useState(false);

    // --- TOAST NOTIF ---
    const [toast, setToast] = useState<{
        show: boolean;
        message: string;
        type: "success" | "error";
    }>({ show: false, message: "", type: "success" });

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(
            () => setToast({ show: false, message: "", type: "success" }),
            2500
        );
    };

    // --- MODAL STATE ----
    const [modal, setModal] = useState({
        isOpen: false,
        message: "",
        isDeletion: false,
        spkToDelete: null as SPKItem | null,
    });

    const closeModal = () => {
        setModal({
            isOpen: false,
            message: "",
            isDeletion: false,
            spkToDelete: null,
        });
    };

    // --- NAVIGASI Aksi ---
    const handleAdd = () => router.push("/dashboard/spk/format");
    const handleView = (spk: SPKItem) =>
        router.push(`/dashboard/spk/format?view=${spk.uuid}`);
    const handleEdit = (spk: SPKItem) =>
        router.push(`/dashboard/spk/format?edit=${spk.uuid}`);

    const handleDelete = (spk: SPKItem) => {
        setModal({
            isOpen: true,
            message: `Apakah Anda yakin ingin menghapus SPK ${spk.nomor}?`,
            isDeletion: true,
            spkToDelete: spk,
        });
    };

    // --- DELETE WITH LOADING + TOAST ---
    const confirmDeletion = async () => {
        if (!modal.spkToDelete) return;

        const uuid = modal.spkToDelete.uuid;

        closeModal();
        setDeleting(true);

        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Token tidak ditemukan. Silakan login ulang.", "error");
            setDeleting(false);
            return;
        }

        try {
            const res = await fetch(`${DELETE_API_SPK_URL_LOCAL}/${uuid}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Gagal menghapus SPK");
            }

            setSpks(spks.filter((item) => item.uuid !== uuid));
            showToast("SPK berhasil dihapus!", "success");
        } catch (err: any) {
            showToast(`Gagal menghapus: ${err.message}`, "error");
        } finally {
            setDeleting(false);
            fetchData();
        }
    };

    // ---- FETCH DATA LIST SPK ----
    const fetchData = async () => {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setError("Token tidak ditemukan.");
            setLoading(false);
            return;
        }

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const res = await fetch(GET_API_SPK_URL_LOCAL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-store",
                    },
                });

                const result = await res.json();

                if (!res.ok || !result.success) {
                    throw new Error(result.message || `Gagal memuat data`);
                }

                const mapped: SPKItem[] = result.data.map((item: any) => ({
                    id: item.id,
                    nomor: item.uuid ?? item.id,
                    pekerjaan:
                        item.uraian_pekerjaan ||
                        item.jenis_pekerjaan ||
                        "Tidak ada data",
                    tanggal: item.tanggal || "-",
                    status:
                        item.status === "pending"
                            ? "Menunggu"
                            : item.status === "completed"
                            ? "Selesai"
                            : item.status,
                    uuid: item.uuid,
                }));

                setSpks(mapped.filter((i) => i.uuid));
                setLoading(false);
                return;
            } catch (err: any) {
                if (i === MAX_RETRIES - 1) {
                    setError(err.message);
                    setLoading(false);
                }
                await new Promise((r) => setTimeout(r, 500));
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- FILTER ---
    const filteredSpk = spks.filter((item) => {
        const matchSearch =
            item.nomor.toLowerCase().includes(search.toLowerCase()) ||
            item.pekerjaan.toLowerCase().includes(search.toLowerCase());

        const matchStatus =
            filterStatus === "Semua" || item.status === filterStatus;

        return matchSearch && matchStatus;
    });

    const statusCount = {
        semua: spks.length,
        selesai: spks.filter((s) => s.status === "Selesai").length,
        proses: spks.filter((s) => s.status === "Proses").length,
        menunggu: spks.filter((s) => s.status === "Menunggu").length,
    };

    // ---- TOAST UI ----
    const ToastBox = () =>
        toast.show && (
            <div
                className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 animate-slide-in ${
                    toast.type === "success"
                        ? "bg-green-600"
                        : "bg-red-600"
                }`}
            >
                {toast.message}
            </div>
        );

    // ---- CUSTOM MODAL ----
    const CustomModal = () =>
        modal.isOpen ? (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-red-600">
                            Konfirmasi Penghapusan
                        </h3>
                        <button onClick={closeModal}>
                            <X />
                        </button>
                    </div>

                    <p className="text-sm mb-6">{modal.message}</p>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={closeModal}
                            className="px-3 py-2 text-sm bg-gray-200 rounded-lg"
                        >
                            Batal
                        </button>

                        <button
                            onClick={confirmDeletion}
                            disabled={deleting}
                            className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {deleting && (
                                <Loader2
                                    className="animate-spin"
                                    size={16}
                                />
                            )}
                            {deleting ? "Menghapus..." : "Ya, Hapus"}
                        </button>
                    </div>
                </div>
            </div>
        ) : null;

    // ---- UI ----
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
            <ToastBox />
            <CustomModal />

            {/* ---- Konten lainnya tetap sama ---- */}
            {/* ---- TIDAK DIUBAH ---- */}


            {/* ========== HEADER & TABLE MU TETAP SAMA ========== */}
            {/* Paste kembali seluruh UI table kamu di sini seperti sebelumnya */}
        </div>
    );
}
