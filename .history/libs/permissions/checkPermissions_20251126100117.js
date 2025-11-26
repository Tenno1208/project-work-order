export default function checkPermission(permissions = [], needed) {
  return permissions.includes(needed);
}
