export function formatMoney(n) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(n);
}

export function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export function formatShortDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
