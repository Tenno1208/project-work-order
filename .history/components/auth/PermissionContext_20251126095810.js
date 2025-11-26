"use client";
import { createContext } from "react";

const PermissionContext = createContext({
  permissions: [],
  setPermissions: () => {}
});

export default PermissionContext;
