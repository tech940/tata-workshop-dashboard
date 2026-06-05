export function getMappedLocation(val) {
  if (!val) return "Other";
  const s = String(val).toUpperCase();
  if (s.includes("JAMMU") || s.includes("CHANNIRAMA")) return "JAMMU";
  if (s.includes("KATHUA")) return "KATHUA";
  if (s.includes("SAMBA")) return "SAMBA";
  if (s.includes("POONCH")) return "POONCH";
  if (s.includes("UDHAMPUR")) return "UDHAMPUR";
  return s.substring(0, 15);
}
