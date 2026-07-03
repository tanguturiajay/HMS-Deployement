import type { FoodTiming } from "@/services/types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatApptDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isRealDate(s: string): boolean {
  if (!DATE_REGEX.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// Date + time, used for medical-observation recorded times
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Food-timing offset (minutes) as an hours phrase: 30 -> "half hour", 60 -> "1 hour".
export function formatFoodOffset(minutes?: number | null): string {
  if (minutes == null || minutes <= 0) return "";
  if (minutes === 30) return "half hour";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hours`;
}

// Full readable food-timing phrase, e.g. "half hour before food". Empty when absent.
export function formatFoodTiming(timing?: FoodTiming | null): string {
  if (!timing?.relation) return "";
  const offset = formatFoodOffset(timing.offsetMinutes);
  const relation = timing.relation === "BEFORE_FOOD" ? "before food" : "after food";
  return offset ? `${offset} ${relation}` : relation;
}
