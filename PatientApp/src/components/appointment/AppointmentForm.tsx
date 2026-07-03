import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";
import { showError, showSuccess } from "@/utils/alerts";
import { formatDate, isRealDate } from "@/utils/format";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabInset, KeyboardScrollPadding } from "@/constants/theme";
import AvailabilityCalendar from "@/components/common/AvailabilityCalendar";
import { RequiredMark } from "@/components/common/RequiredMark";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  bookAppointment,
  getBookedSlots,
  getDoctors,
  updateAppointment,
} from "@/services/appointmentService";
import type { Doctor } from "@/services/types";

const TEAL = "#2e9466";
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

// Slot length in minutes — kept consistent with the Angular web app.
const SLOT_MINUTES = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

function buildSlots(startTime: string, endTime: string) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots: string[] = [];
  for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
    slots.push(`${fromMinutes(t)}-${fromMinutes(t + SLOT_MINUTES)}`);
  }
  return slots;
}

function weekdayOf(dateStr: string): string | null {
  if (!DATE_REGEX.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return WEEKDAYS[date.getDay()];
}

// Booking window: today through 6 months ahead.
const MIN_DATE = new Date();
MIN_DATE.setHours(0, 0, 0, 0);

const MAX_DATE = new Date();
MAX_DATE.setHours(0, 0, 0, 0);
MAX_DATE.setMonth(MAX_DATE.getMonth() + 6);

function isBeyondMax(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getTime() > MAX_DATE.getTime();
}

function getDateError(date: string): string | undefined {
  if (!date) return "Required";
  if (!DATE_REGEX.test(date)) return "Use YYYY-MM-DD format";
  if (!isRealDate(date)) return "Enter a valid calendar date";
  if (isBeyondMax(date)) return "Appointments can only be booked up to 6 months in advance";
  return undefined;
}

// Per-field validation messages (undefined = valid)
function getFormErrors(
  doctorCode: string,
  date: string,
  availableSlots: readonly string[],
  selectedSlot: string,
) {
  return {
    doctor: doctorCode ? undefined : "Please select a doctor",
    date: getDateError(date),
    timeSlot:
      availableSlots.length > 0 && !selectedSlot
        ? "Please select a time slot"
        : undefined,
  };
}

function doctorLabel(doctor: Doctor | undefined): string {
  if (!doctor) return "Select a doctor";
  if (doctor.specialization) return `Dr. ${doctor.name} · ${doctor.specialization}`;
  return `Dr. ${doctor.name}`;
}

function feeLabel(fee: number | null | undefined): string {
  if (fee != null) return `₹ ${fee}`;
  return "Not set";
}

function submitLabel(submitting: boolean, mode: "book" | "edit"): string {
  if (submitting) return "Saving…";
  if (mode === "book") return "Confirm booking";
  return "Save changes";
}

type FormSelection = Readonly<{ doctorCode: string; date: string; selectedSlot: string }>;

// Book mode is dirty on any input; edit mode only when moved off the initial selection
function isFormDirty(mode: "book" | "edit", current: FormSelection, initial: FormSelection): boolean {
  if (mode === "book") {
    return Boolean(current.doctorCode || current.date || current.selectedSlot);
  }
  return (
    current.doctorCode !== initial.doctorCode ||
    current.date !== initial.date ||
    current.selectedSlot !== initial.selectedSlot
  );
}

// Loads the active doctor list once on mount
function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDoctors();
        setDoctors(data.doctors);
      } catch (err) {
        showError(err);
      } finally {
        setLoadingDoctors(false);
      }
    })();
  }, []);

  return { doctors, loadingDoctors };
}

// Tracks booked slots for the selected doctor/date combination
function useBookedSlots(doctorCode: string, date: string) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!doctorCode || !DATE_REGEX.test(date)) {
      setBookedSlots([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const data = await getBookedSlots(doctorCode, date);
        if (active) setBookedSlots(data.bookedSlots);
      } catch {
        if (active) setBookedSlots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [doctorCode, date]);

  return bookedSlots;
}

type DoctorDropdownProps = Readonly<{
  doctors: Doctor[];
  selectedDoctor: Doctor | undefined;
  open: boolean;
  error: string | undefined;
  onToggle: () => void;
  onSelect: (code: string) => void;
}>;

function DoctorDropdown({
  doctors,
  selectedDoctor,
  open,
  error,
  onToggle,
  onSelect,
}: DoctorDropdownProps) {
  const [search, setSearch] = useState("");

  // Filter doctors by name, specialization, or department for the dropdown search.
  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      [d.name, d.specialization, d.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [doctors, search]);

  const handleSelect = (code: string) => {
    setSearch("");
    onSelect(code);
  };

  return (
    <>
      <Text style={styles.fieldLabel}>Doctor<RequiredMark /></Text>
      <TouchableOpacity
        style={[styles.dropdownTrigger, error ? styles.dropdownTriggerError : undefined]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={selectedDoctor ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {doctorLabel(selectedDoctor)}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#6b7280" />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open && (
        <View style={styles.dropdownList}>
          <View style={styles.dropdownSearch}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" />
            <TextInput
              style={styles.dropdownSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or specialization..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {filteredDoctors.length === 0 ? (
            <Text style={styles.dropdownEmpty}>No results found</Text>
          ) : (
            filteredDoctors.map((d) => (
              <TouchableOpacity
                key={d.employeeCode}
                style={styles.dropdownItem}
                onPress={() => handleSelect(d.employeeCode)}
              >
                <Text style={styles.dropdownItemName}>Dr. {d.name}</Text>
                <Text style={styles.dropdownItemMeta}>
                  {[d.specialization, d.department].filter(Boolean).join(" · ") || "General"}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </>
  );
}

type SlotsSectionProps = Readonly<{
  selectedDoctor: Doctor | undefined;
  dateValid: boolean;
  candidateSlots: string[];
  availableSlots: string[];
  selectedSlot: string;
  error: string | undefined;
  onSelect: (slot: string) => void;
}>;

function SlotsSection({
  selectedDoctor,
  dateValid,
  candidateSlots,
  availableSlots,
  selectedSlot,
  error,
  onSelect,
}: SlotsSectionProps) {
  if (!selectedDoctor || !dateValid) {
    return <Text style={styles.hint}>Select a doctor and date to see available slots.</Text>;
  }
  if (candidateSlots.length === 0) {
    return (
      <Text style={styles.hint}>
        Dr. {selectedDoctor.name} is not available on this day. Try another date.
      </Text>
    );
  }
  if (availableSlots.length === 0) {
    return (
      <Text style={styles.hint}>
        All slots for this day are booked. Try another date.
      </Text>
    );
  }
  return (
    <>
      <View style={styles.slotsWrap}>
        {availableSlots.map((slot) => {
          const isActive = selectedSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.slot, isActive && styles.slotActive]}
              onPress={() => onSelect(slot)}
              activeOpacity={0.8}
            >
              <Text style={[styles.slotText, isActive && styles.slotTextActive]}>
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  );
}

export type AppointmentFormProps = {
  mode: "book" | "edit";
  appointmentId?: string;
  initialDoctorCode?: string;
  initialDate?: string;
  initialTimeSlot?: string;
  // Embedded mode: host screen provides the safe area inset and header
  embedded?: boolean;
  // Called after a successful submit instead of router.replace("/explore").
  onDone?: () => void;
};

export default function AppointmentForm({
  mode,
  appointmentId,
  initialDoctorCode,
  initialDate,
  initialTimeSlot,
  embedded = false,
  onDone,
}: Readonly<AppointmentFormProps>) {
  const router = useRouter();
  const guarded = useGuardedRouter();

  const { doctors, loadingDoctors } = useDoctors();
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [doctorCode, setDoctorCode] = useState(initialDoctorCode ?? "");
  const [date, setDate] = useState(initialDate ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(initialTimeSlot ?? "");
  const bookedSlots = useBookedSlots(doctorCode, date);
  const [submitting, setSubmitting] = useState(false);

  const [touched, setTouched] = useState({ doctor: false, date: false, timeSlot: false });
  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const dirty = isFormDirty(
    mode,
    { doctorCode, date, selectedSlot },
    {
      doctorCode: initialDoctorCode ?? "",
      date: initialDate ?? "",
      selectedSlot: initialTimeSlot ?? "",
    },
  );
  useUnsavedChanges(dirty);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.employeeCode === doctorCode),
    [doctors, doctorCode],
  );

  // Weekdays the doctor is available + their booking cutoff (drive the calendar)
  const doctorDays = useMemo(
    () => Array.from(new Set((selectedDoctor?.availabilitySlots ?? []).map((w) => w.day))),
    [selectedDoctor],
  );
  const doctorCutoff = useMemo(
    () => (selectedDoctor?.bookingCutoffDate ? new Date(selectedDoctor.bookingCutoffDate) : null),
    [selectedDoctor],
  );

  const candidateSlots = useMemo(() => {
    if (!selectedDoctor || !date) return [];
    const weekday = weekdayOf(date);
    if (!weekday) return [];
    const windows = (selectedDoctor.availabilitySlots ?? []).filter(
      (w) => w.day === weekday,
    );
    const slots = windows.flatMap((w) => buildSlots(w.startTime, w.endTime));
    // Hide already-passed slots for today; the backend rejects them with 409
    const now = new Date();
    if (date !== formatDate(now)) return slots;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.filter((slot) => toMinutes(slot.slice(0, 5)) > nowMinutes);
  }, [selectedDoctor, date]);

  // Hide slots booked by others but keep the slot being edited
  const availableSlots = useMemo(
    () =>
      candidateSlots.filter(
        (slot) => !bookedSlots.includes(slot) || slot === initialTimeSlot,
      ),
    [candidateSlots, bookedSlots, initialTimeSlot],
  );

  const onSelectDoctor = (code: string) => {
    setDoctorCode(code);
    setDoctorOpen(false);
    if (code !== initialDoctorCode) setSelectedSlot("");
  };

  const onToggleDoctor = () => {
    // Mark touched only when closing the dropdown so the error never flashes on open
    if (doctorOpen) touch("doctor");
    setDoctorOpen(!doctorOpen);
  };

  // Collapsing the dropdown without a selection surfaces the required error
  const blurDoctor = () => {
    if (doctorOpen) {
      setDoctorOpen(false);
      touch("doctor");
    }
  };

  const openDatePicker = () => {
    blurDoctor();
    setShowDatePicker(true);
  };

  const errors = getFormErrors(doctorCode, date, availableSlots, selectedSlot);

  const handleSubmit = async () => {
    blurDoctor();
    setTouched({ doctor: true, date: true, timeSlot: true });
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      if (mode === "book") {
        await bookAppointment(doctorCode, date, selectedSlot);
        showSuccess(MESSAGES.APPOINTMENT_BOOKED, ALERT_TITLES.BOOKED);
      } else {
        await updateAppointment(appointmentId!, doctorCode, date, selectedSlot);
        showSuccess(MESSAGES.APPOINTMENT_UPDATED, ALERT_TITLES.UPDATED);
      }
      if (onDone) {
        onDone();
      } else {
        router.replace("/explore");
      }
    } catch (err) {
      showError(
        err,
        mode === "book" ? ALERT_TITLES.BOOKING_FAILED : ALERT_TITLES.UPDATE_FAILED,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDoctors) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        embedded && styles.containerEmbedded,
        { paddingBottom: BottomTabInset + KeyboardScrollPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      <SafeAreaView edges={embedded ? [] : ["top"]}>
        {!embedded && (
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                blurDoctor();
                guarded.back();
              }}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === "book" ? "Book appointment" : "Reschedule appointment"}
            </Text>
          </View>
        )}

        <DoctorDropdown
          doctors={doctors}
          selectedDoctor={selectedDoctor}
          open={doctorOpen}
          error={touched.doctor ? errors.doctor : undefined}
          onToggle={onToggleDoctor}
          onSelect={onSelectDoctor}
        />

        {/* Consultation fee — read-only, mirrors the web app's fee pill */}
        {selectedDoctor && (
          <>
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Consultation fee</Text>
            <View style={styles.feePill}>
              <Ionicons name="cash-outline" size={18} color={TEAL} />
              <Text style={styles.feeText}>{feeLabel(selectedDoctor.consultationFee)}</Text>
            </View>
          </>
        )}

        {/* Date — tapping opens the native date picker */}
        <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Date<RequiredMark /></Text>
        <TouchableOpacity
          style={[
            styles.dropdownTrigger,
            touched.date && errors.date ? styles.dropdownTriggerError : undefined,
          ]}
          onPress={openDatePicker}
          activeOpacity={0.8}
        >
          <Text style={date ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {date || "Select a date"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
        {touched.date && errors.date ? (
          <Text style={styles.errorText}>{errors.date}</Text>
        ) : null}

        <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Time slot<RequiredMark /></Text>
        <SlotsSection
          selectedDoctor={selectedDoctor}
          dateValid={DATE_REGEX.test(date)}
          candidateSlots={candidateSlots}
          availableSlots={availableSlots}
          selectedSlot={selectedSlot}
          error={touched.timeSlot ? errors.timeSlot : undefined}
          onSelect={(slot) => {
            setSelectedSlot(slot);
            touch("timeSlot");
          }}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (submitting || (mode === "edit" && !dirty)) && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || (mode === "edit" && !dirty)}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>{submitLabel(submitting, mode)}</Text>
        </TouchableOpacity>

        <AvailabilityCalendar
          visible={showDatePicker}
          value={date}
          title="Appointment date"
          minimumDate={MIN_DATE}
          maximumDate={MAX_DATE}
          availableDays={doctorDays}
          cutoffDate={doctorCutoff}
          onSelect={(iso) => {
            setDate(iso);
            setSelectedSlot("");
            setShowDatePicker(false);
            touch("date");
          }}
          onClose={() => {
            setShowDatePicker(false);
            touch("date");
          }}
        />
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, backgroundColor: "#fff" },
  containerEmbedded: { paddingTop: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingTop: 12, marginBottom: 24 },
  backBtn: { marginRight: 8, padding: 4 },
  title: { fontSize: 22, fontWeight: "700", color: "#1f2937" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownTriggerError: {
    borderColor: "#ef4444",
  },
  dropdownValue: { fontSize: 15, color: "#1f2937", fontWeight: "500", flex: 1 },
  dropdownPlaceholder: { fontSize: 15, color: "#9ca3af", flex: 1 },
  dropdownList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  dropdownItemName: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  dropdownItemMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  dropdownEmpty: { padding: 14, color: "#9ca3af", fontSize: 14, textAlign: "center" },
  dropdownSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownSearchInput: {
    flex: 1,
    paddingVertical: 4,
    fontSize: 14,
    color: "#1f2937",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 2,
  },
  hint: { fontSize: 14, color: "#9ca3af", paddingVertical: 8 },
  feePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  feeText: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  slotsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  slot: {
    width: "48%",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  slotActive: { borderColor: TEAL, backgroundColor: "#f0fdf4" },
  slotText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  slotTextActive: { color: TEAL },
  submitButton: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
