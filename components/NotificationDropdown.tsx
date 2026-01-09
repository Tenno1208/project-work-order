"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Notification {
    id: number;
    title: string;
    message: string;
    read: boolean;
    created_at?: string;
    uuid_pengajuan?: string;
}

interface NotificationDropdownProps {
    show: boolean;
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    loadingMore?: boolean;
    showingAllNotifications?: boolean;
    onMarkAsRead: (id: number) => void;
    onMarkAllAsRead: () => void;
    onLoadMoreNotifications: () => void;
    markingAllAsRead?: boolean;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    show,
    notifications,
    unreadCount,
    loading,
    loadingMore = false,
    showingAllNotifications = false,
    onMarkAsRead,
    onMarkAllAsRead,
    onLoadMoreNotifications,
    markingAllAsRead = false,
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    // Matikan loading saat URL berubah
    useEffect(() => {
        setIsRedirecting(false);
    }, [pathname, searchParams]);
    
    const formatNotificationDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit yang lalu`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} jam yang lalu`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} hari yang lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    };

    // =====================================================================
    // --- LOGIKA MAPPING REDIRECT (SATU PESAN SATU LINK) ------------------
    // =====================================================================
    const getRedirectUrl = (notification: Notification): string => {
        const title = notification.title || "";
        const uuid = notification.uuid_pengajuan;

        // Jika tidak ada UUID, lempar ke halaman list notifikasi
        if (!uuid) return '/dashboard/notifications';

        // 1. Pengajuan Baru Masuk (Approval) -> Edit (Untuk TTD)
        // Edit biasanya pakai Path Param [uuid], tapi sesuaikan dengan struktur folder Anda.
        // Asumsi: folder edit menggunakan [uuid] -> /dashboard/lampiran/edit/[uuid]
        if (title === "Pengajuan Baru Masuk") {
            return `/dashboard/lampiran/edit/${uuid}`;
        }

        // 2. Status Pengajuan Diupdate (Info ke Pelapor) -> View
        // View menggunakan Query Param -> /dashboard/lampiran/view?uuid=...
        if (title === "Status Pengajuan Diupdate") {
            return `/dashboard/lampiran/view/${uuid}`;
        }

        // 3. SPK Ditugaskan (Info ke Pelapor) -> View
        // View menggunakan Query Param -> /dashboard/spk/view?uuid=...
        if (title === "SPK Ditugaskan") {
            return `/dashboard/spk/view?uuid=${uuid}`;
        }

        // 4. Penanggung Jawab Baru (PIC) -> Edit SPK (Isi Laporan)
        // Edit SPK biasanya pakai Path Param -> /dashboard/spk/format/[uuid]
        if (title === "Penanggung Jawab Baru") {
            return `/dashboard/spk/format?uuid=${uuid}`; // Ubah ke query param jika folder format/page.tsx tidak punya [uuid]
        }

        // 5. Penugasan Baru (Anggota Tim) -> View SPK (Lihat Tugas)
        if (title === "Penugasan Baru") {
            return `/dashboard/spk/view?uuid=${uuid}`;
        }

        // 6. SPK Menunggu Persetujuan (Menyetujui) -> Edit SPK (TTD)
        if (title === "SPK Menunggu Persetujuan") {
            return `/dashboard/spk/format?uuid=${uuid}`; // Ubah ke query param jika perlu
        }

        // 7. SPK Menunggu Tanda Tangan (Mengetahui) -> Edit SPK (TTD)
        if (title.toLowerCase().includes("spk menunggu tanda tangan")) {
            return `/dashboard/spk/format?uuid=${uuid}`; // Ubah ke query param jika perlu
        }

        // 8. SPK Selesai (Info) -> View SPK
        if (title === "SPK Selesai") {
            return `/dashboard/spk/view?uuid=${uuid}`;
        }

        // 9. Ada Penugasan SPK Baru (Kepala Unit/Satker) -> Halaman Assign SPK
        // Asumsi: Halaman assign juga menggunakan query param ?uuid=...
        if (title === "Ada Penugasan SPK Baru") {
            return `/dashboard/spk/assign?uuid=${uuid}`; 
        }

        // --- FALLBACK DEFAULT (JIKA JUDUL TIDAK DIKENALI) ---
        if (title.toLowerCase().includes('spk')) {
            return `/dashboard/spk/view?uuid=${uuid}`;
        }

        return `/dashboard/lampiran/view?uuid=${uuid}`;
    };

    const handleNotificationClick = (e: React.MouseEvent, notification: Notification) => {
        e.preventDefault();
        e.stopPropagation();
        
        const targetUrl = getRedirectUrl(notification);
        
        // Cek agar tidak loading jika url tujuan SAMA dengan url sekarang
        if (targetUrl === pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')) {
             return;
        }

        setIsRedirecting(true);
        
        if (!notification.read) {
            onMarkAsRead(notification.id).catch(err => 
                console.error("Gagal menandai notifikasi:", err)
            );
        }
        
        router.push(targetUrl);
    };

    const getUnreadBadgeColor = (notification: Notification): string => {
        const title = notification.title.toLowerCase();
        if (title.includes('spk')) return 'bg-green-500';
        if (title.includes('pengajuan')) return 'bg-blue-500';
        return 'bg-blue-500';
    };

    const getClickIndicatorText = (notification: Notification): string => {
        const url = getRedirectUrl(notification);
        if (url.includes('/edit/') || url.includes('/format') || url.includes('/assign')) return 'Klik untuk memproses data';
        return 'Klik untuk melihat detail';
    };

    const getIndicatorColor = (notification: Notification): string => {
        const url = getRedirectUrl(notification);
        if (url.includes('/edit/') || url.includes('/format') || url.includes('/assign')) return 'text-orange-500';
        return 'text-blue-500';
    };
    
    const sortedNotifications = [...notifications].sort((a, b) => {
        if (a.read !== b.read) {
            return a.read ? 1 : -1; 
        }
        if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return 0;
    });

    return (
        <>
            <div className="w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden relative">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">Notifikasi</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                   if (!markingAllAsRead) { 
                                        onMarkAllAsRead();
                                    }
                                }} 
                                disabled={markingAllAsRead}
                                className={`text-xs font-medium flex items-center gap-1 ${
                                    markingAllAsRead ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                                }`}
                                    >
                                        {markingAllAsRead ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Tandai semua sudah dibaca"
                            )}
                        </button>
                    )}
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center">
                            <Loader2 className="animate-spin mx-auto text-gray-400 mb-2" size={24} />
                            <p className="text-gray-500 text-sm">Memuat notifikasi...</p>
                        </div>
                    ) : sortedNotifications.length > 0 ? (
                        sortedNotifications.map((notification) => (
                            <div 
                                key={notification.id} 
                                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    !notification.read ? 'bg-blue-50' : ''
                                }`} 
                                onClick={(e) => handleNotificationClick(e, notification)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                        notification.read ? 'bg-gray-300' : getUnreadBadgeColor(notification)
                                    }`}></div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-medium truncate ${
                                            notification.read ? 'text-gray-700' : 'text-gray-900'
                                        }`}>
                                            {notification.title}
                                        </h4>
                                        <p className={`text-xs mt-1 ${
                                            notification.read ? 'text-gray-500' : 'text-gray-600'
                                        }`}>
                                            {notification.message}
                                        </p>
                                        {notification.created_at && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatNotificationDate(notification.created_at)}
                                            </p>
                                        )}
                                        {notification.uuid_pengajuan && (
                                            <p className={`text-xs mt-1 ${getIndicatorColor(notification)}`}>
                                                {getClickIndicatorText(notification)}
                                            </p>
                                        )}
                                    </div>
                                    {!notification.read && (
                                        <div className="p-1 bg-blue-100 rounded-full">
                                            <div className={`w-2 h-2 rounded-full ${getUnreadBadgeColor(notification)}`}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-gray-500 text-sm">Tidak ada notifikasi</p>
                        </div>
                    )}
                </div>
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onLoadMoreNotifications();
                        }} 
                        className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-2 disabled:opacity-50"
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Memuat...' : (showingAllNotifications ? 'Tampilkan Lebih Sedikit' : 'Lihat Semua Notifikasi')}
                    </button>
                </div>
            </div>

            {/* FULL SCREEN LOADING OVERLAY */}
            {isRedirecting && (
                <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <Loader2 className="animate-spin text-blue-600 mb-3" size={48} />
                        <h3 className="text-lg font-semibold text-gray-800">Mengalihkan...</h3>
                        <p className="text-sm text-gray-500">Mohon tunggu sebentar</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationDropdown;