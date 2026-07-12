export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function fmt(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
