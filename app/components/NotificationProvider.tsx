
"use client";

import { useEffect } from 'react';

export function NotificationProvider() {
  useEffect(() => {

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Izin notifikasi browser diberikan.");
          } else {
            console.log("Izin notifikasi browser ditolak.");
          }
        });
      }
    }
  }, []);

  // Komponen ini tidak merender apa-apa (invisible)
  return null;
}