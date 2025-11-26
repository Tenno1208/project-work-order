"use client";

import { useContext } from "react";
import PermissionContext from "./PermissionContext";

export default function withPermission(requiredPermission, Component) {
  return function PermissionWrapper(props) {
    const { permissions } = useContext(PermissionContext);

    if (!permissions.includes(requiredPermission)) {
      return null; // tidak tampil kalau tidak ada permission
    }

    return <Component {...props} />;
  };
}
