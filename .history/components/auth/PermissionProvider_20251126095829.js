"use client";

import React, { useEffect, useState } from "react";
import PermissionContext from "./PermissionContext";

export default function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("permissions");
    if (saved) {
      setPermissions(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (permissions.length > 0) {
      localStorage.setItem("permissions", JSON.stringify(permissions));
    }
  }, [permissions]);

  return (
    <PermissionContext.Provider value={{ permissions, setPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}
