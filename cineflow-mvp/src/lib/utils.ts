import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  // Date-only strings (YYYY-MM-DD) must be parsed as local to avoid UTC-shift
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
  }
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
