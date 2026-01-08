// components/RiwayatTtdContent.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { FileSignature, Trash2, Loader2, AlertCircle, Calendar, FileText, Image as ImageIcon, Upload, Edit, X, ZoomIn, Download } from 'lucide-react';

const IMAGE_STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || 'https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=';

interface TtdRecord {
    id: string;
    uuid_pengajuan?: string;
    judul_dokumen?: string;
    tanggal_dibuat?: string;
    status?: string;
    ttd_path?: string; // Menambahkan path untuk tanda tangan individual
}

interface TtdApiResponse {
    success: boolean;
    ttd_path: string;
    ttd_list: TtdRecord[];
}

export default function RiwayatTtdContent() {
    const [ttdList, setTtdList] = useState<TtdRecord[]>([]);
    const [ttdPath, setTtdPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [deletingSignature, setDeletingSignature] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const getUserData = () => {
        const storedUserData = localStorage.getItem("user_data");
        if (storedUserData) {
            try {
                return JSON.parse(storedUserData);
            } catch (e) {
                console.error("Gagal parse user data:", e);
                return null;
            }
        }
        return null;
    };
    
    const getToken = () => localStorage.getItem("token");

    const fetchTtdHistory = async () => {
        setLoading(true);
        setError(null);
        setImageError(false);
        const userData = getUserData();
        const token = getToken();

        if (!userData?.npp || userData.npp === '-') {
            setError("NPP tidak ditemukan. Silakan login ulang.");
            setLoading(false);
            return;
        }

        if (!token) {
            setError("Token autentikasi tidak ditemukan. Silakan login ulang.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/ttd-proxy/${userData.npp}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Gagal mengambil data: ${res.statusText}`);
            }

            const apiResponse: TtdApiResponse = await res.json();
            
            if (apiResponse.success) {
                setTtdList(apiResponse.ttd_list);
                setTtdPath(apiResponse.ttd_path);
            } else {
                throw new Error("API melaporkan kegagalan.");
            }

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan yang tidak diketahui.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = window.confirm("Apakah Anda yakin ingin menghapus riwayat TTD ini?");
        if (!isConfirmed) return;

        setDeletingId(id);
        const token = getToken();

        if (!token) {
            alert("Token autentikasi tidak ditemukan. Silakan login ulang.");
            setDeletingId(null);
            return;
        }

        try {
            // Menggunakan API lokal untuk delete
            const res = await fetch(`/api/user/delete/ttd/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Gagal menghapus data: ${res.statusText}`);
            }

            setTtdList(prevList => prevList.filter(item => item.id !== id));

        } catch (err: any) {
            alert(`Error: ${err.message || "Gagal menghapus data."}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteSignature = async () => {
        const isConfirmed = window.confirm("Apakah Anda yakin ingin menghapus tanda tangan aktif ini?");
        if (!isConfirmed) return;

        setDeletingSignature(true);
        const token = getToken();

        if (!token) {
            alert("Token autentikasi tidak ditemukan. Silakan login ulang.");
            setDeletingSignature(false);
            return;
        }

        try {
            const res = await fetch(`/api/user/delete/ttd/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Gagal menghapus tanda tangan: ${res.statusText}`);
            }

            setTtdPath(null);

        } catch (err: any) {
            alert(`Error: ${err.message || "Gagal menghapus tanda tangan."}`);
        } finally {
            setDeletingSignature(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const token = getToken();
        const userData = getUserData();

        if (!token) {
            alert("Token autentikasi tidak ditemukan. Silakan login ulang.");
            setUploading(false);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('npp', userData?.npp || '');

        try {
            // Menggunakan API lokal untuk upload
            const res = await fetch('/api/ttd-upload', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Gagal mengunggah tanda tangan: ${res.statusText}`);
            }

            const result = await res.json();
            
            if (result.success) {
                // Refresh data setelah upload berhasil
                await fetchTtdHistory();
                setShowUploadModal(false);
            } else {
                throw new Error(result.message || "Upload gagal");
            }

        } catch (err: any) {
            alert(`Error: ${err.message || "Gagal mengunggah tanda tangan."}`);
        } finally {
            setUploading(false);
            // Reset input file
            e.target.value = '';
        }
    };

    useEffect(() => {
        fetchTtdHistory();
    }, []);

    // Fungsi untuk mendapatkan semua tanda tangan unik dari daftar
    const getUniqueSignatures = () => {
        const signatures = new Set<string>();
        if (ttdPath) signatures.add(ttdPath);
        
        ttdList.forEach(record => {
            if (record.ttd_path) signatures.add(record.ttd_path);
        });
        
        return Array.from(signatures);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                <span className="ml-2 text-gray-600">Memuat riwayat TTD...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mb-8">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg">
                        <FileSignature className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Riwayat Tanda Tangan Digital</h1>
                        <p className="text-sm text-gray-500">Kelola tanda tangan Anda dan lihat riwayat penggunaannya.</p>
                    </div>
                </div>
            </div>

            {/* Galeri Tanda Tangan */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-cyan-600" />
                        Galeri Tanda Tangan
                    </h2>
                    <button 
                        className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors shadow-sm"
                        onClick={() => setShowUploadModal(true)}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload TTD Baru
                    </button>
                </div>
                
                <div className="p-6">
                    {getUniqueSignatures().length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p>Anda belum memiliki tanda tangan digital.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-4 justify-center">
                            {getUniqueSignatures().map((signature, index) => (
                                <div key={index} className="relative group">
                                    <div className="border-2 border-gray-200 rounded-lg p-2 bg-gray-50 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                                        <img 
                                            src={`/api/file-proxy?url=${encodeURIComponent(IMAGE_STORAGE_BASE_URL + signature)}`} 
                                            alt={`Tanda Tangan ${index + 1}`} 
                                            className="h-32 w-64 object-contain cursor-pointer"
                                            onClick={() => setSelectedImage(signature)}
                                        />
                                    </div>
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 p-1">
                                        <button 
                                            className="bg-white rounded-full p-1 shadow-md hover:bg-cyan-50"
                                            onClick={() => setSelectedImage(signature)}
                                            title="Perbesar"
                                        >
                                            <ZoomIn className="h-4 w-4 text-cyan-600" />
                                        </button>
                                        {signature === ttdPath && (
                                            <button 
                                                className="bg-white rounded-full p-1 shadow-md hover:bg-red-50"
                                                onClick={handleDeleteSignature}
                                                disabled={deletingSignature}
                                                title="Hapus"
                                            >
                                                {deletingSignature ? (
                                                    <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {signature === ttdPath && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-cyan-600 text-white text-xs py-1 text-center rounded-b-lg">
                                            Aktif
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Riwayat Penggunaan */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-cyan-600" />
                        Riwayat Penggunaan
                    </h2>
                </div>
                
                <div className="p-0">
                    {ttdList.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileSignature className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p>Belum ada riwayat penggunaan tanda tangan.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tanggal
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dokumen
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col" className="relative px-6 py-3">
                                            <span className="sr-only">Aksi</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ttdList.map((record) => (
                                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                    {record.tanggal_dibuat ? new Date(record.tanggal_dibuat).toLocaleDateString('id-ID') : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">{record.judul_dokumen || 'Tanpa Judul'}</div>
                                                {record.uuid_pengajuan && (
                                                    <div className="text-xs text-gray-500">ID: {record.uuid_pengajuan.substring(0, 8)}...</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    record.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {record.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    disabled={deletingId === record.id}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    title="Hapus Riwayat"
                                                >
                                                    {deletingId === record.id ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal untuk menampilkan gambar yang diperbesar */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl max-h-full">
                        <button 
                            className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X className="h-6 w-6 text-gray-800" />
                        </button>
                        <div className="bg-white rounded-lg p-6 shadow-2xl">
                            <img 
                                src={`/api/file-proxy?url=${encodeURIComponent(IMAGE_STORAGE_BASE_URL + selectedImage)}`} 
                                alt="Tanda Tangan Diperbesar" 
                                className="max-h-[80vh] max-w-full object-contain"
                            />
                            <div className="flex justify-between mt-4">
                                <button className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                                    <Download className="h-4 w-4 mr-2" />
                                    Unduh
                                </button>
                                <button 
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                    onClick={() => setSelectedImage(null)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal untuk Upload TTD */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Upload Tanda Tangan Baru</h3>
                            <button 
                                className="text-gray-400 hover:text-gray-600"
                                onClick={() => setShowUploadModal(false)}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pilih File Tanda Tangan
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                                disabled={uploading}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Format yang didukung: JPG, PNG, GIF. Maksimal 2MB.
                            </p>
                        </div>
                        
                        {uploading && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-cyan-600 mr-2" />
                                <span className="text-sm text-gray-600">Mengunggah...</span>
                            </div>
                        )}
                         
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                onClick={() => setShowUploadModal(false)}
                                disabled={uploading}
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}