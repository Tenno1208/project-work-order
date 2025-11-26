export default function groupPermissions(permissions = []) {
  const grouped = {};

  permissions.forEach((item) => {
    const [moduleName] = item.split(".");
    if (!grouped[moduleName]) {
      grouped[moduleName] = [];
    }
    grouped[moduleName].push(item);
  });

  return grouped;
}
