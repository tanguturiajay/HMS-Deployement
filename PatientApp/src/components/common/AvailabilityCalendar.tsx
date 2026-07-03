import { useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TEAL = "#2e9466";

// JS Date.getDay() (0=Sunday) -> backend WeekDay enum
const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fromDate = (date: Date) => toIso(date.getFullYear(), date.getMonth(), date.getDate());

type AvailabilityCalendarProps = Readonly<{
  visible: boolean;
  value: string;
  title: string;
  minimumDate: Date;
  maximumDate: Date;
  // Weekdays the doctor is available; empty disables every date
  availableDays: readonly string[];
  // Date on/after which booking is closed (null when no cutoff)
  cutoffDate: Date | null;
  onSelect: (iso: string) => void;
  onClose: () => void;
}>;

type DayCell = { iso: string; day: number; selectable: boolean } | null;

// Month grid date picker that enables only the doctor available weekdays and hides dates outside the allowed range
export default function AvailabilityCalendar({
  visible,
  value,
  title,
  minimumDate,
  maximumDate,
  availableDays,
  cutoffDate,
  onSelect,
  onClose,
}: AvailabilityCalendarProps) {
  const initial = value || fromDate(minimumDate);
  const [view, setView] = useState(() => {
    const [y, m] = initial.split("-").map(Number);
    return { y, m: m - 1 };
  });

  const minIso = fromDate(minimumDate);
  const maxIso = fromDate(maximumDate);
  const cutoffIso = cutoffDate ? fromDate(cutoffDate) : null;
  const dayset = useMemo(() => new Set(availableDays), [availableDays]);

  const isSelectable = (y: number, m: number, d: number, iso: string): boolean => {
    if (dayset.size === 0) return false;
    if (iso < minIso || iso > maxIso) return false;
    if (cutoffIso && iso >= cutoffIso) return false;
    return dayset.has(WEEKDAYS[new Date(y, m, d).getDay()]);
  };

  const weeks = useMemo<DayCell[][]>(() => {
    const { y, m } = view;
    const startDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: DayCell[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIso(y, m, d);
      cells.push({ iso, day: d, selectable: isSelectable(y, m, d, iso) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const out: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dayset, minIso, maxIso, cutoffIso]);

  const canPrev = minIso < toIso(view.y, view.m, 1);
  const canNext = maxIso > toIso(view.y, view.m, new Date(view.y, view.m + 1, 0).getDate());

  const shift = (delta: number) => {
    const next = new Date(view.y, view.m + delta, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.done}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity
              disabled={!canPrev}
              onPress={() => shift(-1)}
              style={styles.navBtn}
            >
              <Text style={[styles.navText, !canPrev && styles.navDisabled]}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[view.m]} {view.y}
            </Text>
            <TouchableOpacity
              disabled={!canNext}
              onPress={() => shift(1)}
              style={styles.navBtn}
            >
              <Text style={[styles.navText, !canNext && styles.navDisabled]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week) => {
            // Key each week by its first real day's ISO (stable, unlike the row index)
            const weekKey = week.find(Boolean)?.iso ?? "week";
            return (
            <View key={weekKey} style={styles.weekRow}>
              {week.map((cell, ci) => {
                if (!cell) {
                  return <View key={`${weekKey}-pad-${ci}`} style={[styles.cell, styles.cellEmpty]} />;
                }
                const selected = value === cell.iso;
                return (
                  <TouchableOpacity
                    key={cell.iso}
                    style={[
                      styles.cell,
                      !cell.selectable && styles.cellEmpty,
                      selected && styles.cellSelected,
                    ]}
                    disabled={!cell.selectable}
                    onPress={() => onSelect(cell.iso)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        !cell.selectable && styles.cellTextDisabled,
                        selected && styles.cellTextSelected,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            );
          })}

          {dayset.size === 0 && (
            <Text style={styles.hint}>Select a doctor to see available dates.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  done: { fontSize: 16, fontWeight: "700", color: TEAL },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 24, color: TEAL, lineHeight: 26 },
  navDisabled: { color: "#cbd5e1" },
  weekRow: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    paddingVertical: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 2,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  cellEmpty: { backgroundColor: "transparent" },
  cellSelected: { backgroundColor: TEAL },
  cellText: { fontSize: 14, color: "#1f2937" },
  cellTextDisabled: { color: "#cbd5e1" },
  cellTextSelected: { color: "#fff", fontWeight: "700" },
  hint: { textAlign: "center", color: "#9ca3af", fontSize: 13, paddingVertical: 12 },
});
