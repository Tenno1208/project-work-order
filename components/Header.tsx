"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { Bell, Settings, Users, Clock, Waves, Droplet } from 'lucide-react';

import NotificationPortal from '@/components/NotificationPortal';

interface HeaderProps {
    currentPage: any;
    currentTime: Date;
    mounted: boolean;
    userData: any;
    loading: boolean;
    unreadNotificationCount: number;
    notifications: any[];
    showNotificationDropdown: boolean;
    setShowNotificationDropdown: (show: boolean) => void;
    loadingNotifications: boolean;
    fetchNotifications: () => void;
    markNotificationAsRead: (id: number) => void;
    markAllNotificationsAsRead: () => void;
    markAllNotificationsAsReadAll: () => void; 
    markingAllAsRead?: boolean;
    loadingMoreNotifications?: boolean;
    showingAllNotifications?: boolean; 
    onLoadMoreNotifications: () => void; 
}

const Header: React.FC<HeaderProps> = ({
    currentPage,
    currentTime,
    mounted,
    userData,
    loading,
    unreadNotificationCount,
    notifications,
    showNotificationDropdown,
    setShowNotificationDropdown,
    loadingNotifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    markAllNotificationsAsReadAll,
    markingAllAsRead,
    loadingMoreNotifications, 
    showingAllNotifications,
    onLoadMoreNotifications, 
}) => {
    const notificationRef = useRef<HTMLDivElement>(null);
    const notificationButtonRef = useRef<HTMLButtonElement>(null);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        const target = event.target as Node;

        if (notificationButtonRef.current && notificationButtonRef.current.contains(target)) {
            return;
        }

        const portalContainer = document.getElementById('notification-portal-container');
        if (portalContainer && portalContainer.contains(target)) {
            return;
        }

        if (notificationRef.current && !notificationRef.current.contains(target)) {
            setShowNotificationDropdown(false);
        }
    }, [setShowNotificationDropdown]);

    useEffect(() => {
        if (showNotificationDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotificationDropdown, handleClickOutside]);

    const handleNotificationClick = () => {
        setShowNotificationDropdown(!showNotificationDropdown);
    };

    return (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 shadow-xl relative overflow-hidden backdrop-blur-xl border-b border-white/10">
            <svg className="absolute bottom-0 left-0 w-full h-12 opacity-10" viewBox="0 0 1440 100" preserveAspectRatio="none">
                <path fill="white" d="M0,50 C240,80 480,20 720,50 C960,80 1200,20 1440,50 L1440,100 L0,100 Z">
                    <animate attributeName="d" dur="10s" repeatCount="indefinite" values="M0,50 C240,80 480,20 720,50 C960,80 1200,20 1440,50 L1440,100 L0,100 Z;M0,50 C240,20 480,80 720,50 C960,20 1200,80 1440,50 L1440,100 L0,100 Z;M0,50 C240,80 480,20 720,50 C960,20 1200,80 1440,50 L1440,100 L0,100 Z;M0,50 C240,80 480,20 720,50 C960,80 1200,80 1440,50 L1440,100 L0,100 Z" />
                </path>
            </svg>

            <div className="relative z-10 px-4 lg:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3 ml-12 lg:ml-0">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/30 hover:scale-105 transition-transform">
                        {currentPage.icon && <currentPage.icon className="text-white drop-shadow-md" size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight drop-shadow-lg">{currentPage.label}</h1>
                        <p className="text-cyan-100 text-xs font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-300 rounded-full"></span>{currentPage.description}</p>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity"><Droplet className="text-white/80" size={16} /></div>
                        <div className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 shadow-lg relative overflow-hidden group-hover:bg-white/20 transition-all">
                            <div className="absolute inset-0 opacity-20"><div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-cyan-400/30 to-transparent animate-pulse"></div></div>
                            <div className="relative z-10 flex items-center gap-2">
                                {mounted && (<><Clock className="text-white/90 drop-shadow-sm" size={18} strokeWidth={2.5} /><div className="flex items-baseline gap-1"><span className="text-xl font-bold text-white tabular-nums">{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span><span className="text-cyan-200 text-sm font-medium animate-pulse">{currentTime.toLocaleTimeString("id-ID", { second: "2-digit" })}</span></div><div className="w-px h-5 bg-white/30"></div><div className="text-cyan-100 text-xs font-medium">{currentTime.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</div></>)}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-50"></div>
                        </div>
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity"><Waves className="text-white/80" size={16} /></div>
                    </div>
                </div>

                <div className="flex items-center gap-3 lg:gap-4">
                    <div className="flex items-center bg-white/20 rounded-xl border border-white/30 p-1.5 lg:p-2 pr-3 lg:pr-4 shadow-lg backdrop-blur-md hover:bg-white/25 transition-all">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-white to-cyan-100 rounded-full flex items-center justify-center shadow-md border-2 border-white/50"><Users className="text-cyan-600" size={16} /></div>
                        <div className="ml-2 lg:ml-2 text-left">
                            {loading ? (<><div className="h-3 w-20 bg-white/30 rounded mb-0.5"></div><div className="h-2.5 w-24 bg-white/20 rounded"></div></>) : (<><p className="text-white text-xs font-bold leading-tight drop-shadow">{userData?.nama}</p><p className="text-cyan-100 text-xs leading-tight">NPP: {userData?.npp}</p></>)}
                        </div>
                        <button className="ml-2 lg:ml-3 p-1.5 hover:bg-white/20 rounded-md transition-colors hidden lg:block"><Settings className="text-white" size={16} /></button>
                    </div>

                    <div className="relative" ref={notificationRef}>
                        <button ref={notificationButtonRef} onClick={handleNotificationClick} className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-lg relative group">
                            <Bell className="text-white group-hover:scale-110 transition-transform" size={18} />
                            {unreadNotificationCount > 0 && (<span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border-2 border-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>)}
                        </button>
                        
                        <NotificationPortal
                            show={showNotificationDropdown}
                            buttonRef={notificationButtonRef}
                            notifications={notifications}
                            unreadCount={unreadNotificationCount}
                            loading={loadingNotifications}
                            onMarkAsRead={markNotificationAsRead}
                            onMarkAllAsRead={markAllNotificationsAsReadAll}
                            markingAllAsRead={markingAllAsRead}
                            loadingMoreNotifications={loadingMoreNotifications}
                            showingAllNotifications={showingAllNotifications}
                            onLoadMoreNotifications={onLoadMoreNotifications}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;