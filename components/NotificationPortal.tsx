"use client";

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import NotificationDropdown from './NotificationDropdown';

interface NotificationPortalProps {
    show: boolean;
    buttonRef: React.RefObject<HTMLButtonElement>;
    notifications: any[];
    unreadCount: number;
    loading: boolean;
    onMarkAsRead: (id: number) => void;
    onMarkAllAsRead: () => void;
    markingAllAsRead?: boolean;
    loadingMoreNotifications?: boolean;
    showingAllNotifications?: boolean;
    onLoadMoreNotifications?: () => void;
}

const NotificationPortal: React.FC<NotificationPortalProps> = ({
    show,
    buttonRef,
    notifications,
    unreadCount,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    markingAllAsRead,
    loadingMoreNotifications,
    showingAllNotifications,
    onLoadMoreNotifications,
}) => {
    const [mounted, setMounted] = useState(false);
    const portalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Mengatur posisi dropdown
    useEffect(() => {
        if (!show || !buttonRef.current || !portalRef.current) return;
        
        const buttonRect = buttonRef.current.getBoundingClientRect();
        
        // Menggunakan fixed positioning agar tidak terpengaruh overflow parent
        portalRef.current.style.position = 'fixed';
        portalRef.current.style.top = `${buttonRect.bottom + 10}px`; // Tambah jarak sedikit (margin)
        
        // Logika agar dropdown rata kanan dengan tombol lonceng, tapi tidak melebihi layar
        // Jika layar mobile (sempit), kita bisa override width-nya
        const isMobile = window.innerWidth < 640;
        
        if (isMobile) {
            portalRef.current.style.right = '1rem';
            portalRef.current.style.left = '1rem';
            portalRef.current.style.width = 'auto';
        } else {
            // Desktop: Rata kanan dengan tombol
            portalRef.current.style.right = `${window.innerWidth - buttonRect.right}px`;
            portalRef.current.style.width = '24rem'; // Lebarkan sedikit (default tailwind w-96)
            portalRef.current.style.left = 'auto';
        }

        portalRef.current.style.zIndex = '9999';
        
    }, [show, buttonRef]);

    if (!mounted || !show) {
        return null;
    }

    // Pastikan fallback fungsi jika undefined agar tidak error saat diklik
    const handleLoadMoreSafe = onLoadMoreNotifications || (() => {});

    return createPortal(
        <div ref={portalRef} id="notification-portal-container">
            <NotificationDropdown
                show={true}
                notifications={notifications}
                unreadCount={unreadCount}
                loading={loading}
                onMarkAsRead={onMarkAsRead}
                onMarkAllAsRead={onMarkAllAsRead}
                markingAllAsRead={markingAllAsRead}
                loadingMore={loadingMoreNotifications} 
                showingAllNotifications={showingAllNotifications}
                onLoadMoreNotifications={handleLoadMoreSafe}
            />
        </div>,
        document.body
    );
};

export default NotificationPortal;