//components/LogoutModal.tsx
"use client";

import React from 'react';
import { LogOut, Loader2 } from 'lucide-react';

interface LogoutModalProps {
    show: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    loggingOut: boolean;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ show, onConfirm, onCancel, loggingOut }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-xs text-center relative overflow-hidden transform transition-all scale-100">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>
                <div className="mb-3 flex justify-center">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-full shadow-xl">
                        <LogOut className="text-white" size={24} />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Konfirmasi Logout</h2>
                <p className="text-gray-500 text-sm mb-6">Anda yakin ingin keluar dari sistem?</p>
                <div className="flex justify-center gap-3">
                    <button onClick={onCancel} disabled={loggingOut} className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all font-semibold text-sm disabled:opacity-50">Batal</button>
                    <button onClick={onConfirm} disabled={loggingOut} className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all font-semibold text-sm disabled:opacity-50">{loggingOut ? <Loader2 size={16} className="animate-spin mr-1 inline-block" /> : 'Ya, Logout'}</button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;