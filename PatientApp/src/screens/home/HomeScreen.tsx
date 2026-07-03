import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabInset } from "@/constants/theme";
import AppointmentCard from "@/components/appointment/AppointmentCard";
import { getInitials } from "@/utils/format";
import { getMyAppointments } from "@/services/appointmentService";
import { getMyProfile } from "@/services/patientService";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import type { Appointment } from "@/services/types";

const TEAL = "#2e9466";

const QUICK_ACTIONS = [
  { label: "My appointments", icon: "list-outline" as const, href: "/explore" },
  { label: "My profile", icon: "person-outline" as const, href: "/profile" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

export default function HomeScreen() {
  const router = useRouter();

  // Profile and upcoming BOOKED appointments cached via React Query while errors stay silent here
  const { data, isLoading, refetch, dataUpdatedAt, fetchStatus } = useQuery({
    queryKey: ["homeSummary"],
    queryFn: async () => {
      const [profile, appts] = await Promise.all([
        getMyProfile(),
        getMyAppointments("BOOKED", 1, 100),
      ]);
      const now = Date.now();
      const upcoming = appts.appointments
        .filter((a) => new Date(a.appointmentDate).getTime() >= now - 86400000)
        .sort(
          (a, b) =>
            new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime() ||
            a.timeSlot.localeCompare(b.timeSlot),
        );
      return { userName: profile.patient?.name || "Patient", appointments: upcoming };
    },
  });

  const userName = data?.userName ?? "Patient";
  const appointments: Appointment[] = data?.appointments ?? [];
  const loading = isLoading;

  // Refresh on focus so new or cancelled appointments appear but only when the cached data has gone stale
  useRefetchOnFocusIfStale({ refetch, dataUpdatedAt, fetchStatus });

  let appointmentsContent: ReactNode;
  if (loading) {
    appointmentsContent = <ActivityIndicator color={TEAL} style={{ marginTop: 16 }} />;
  } else if (appointments.length === 0) {
    appointmentsContent = (
      <View style={styles.emptyCard}>
        <Ionicons name="calendar-outline" size={36} color="#d1d5db" />
        <Text style={styles.emptyText}>No upcoming appointments</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push("/book-appointment")}
        >
          <Text style={styles.emptyButtonText}>Book one now</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    appointmentsContent = appointments.map((appt) => (
      <AppointmentCard key={appt.appointmentId} appointment={appt} />
    ));
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.container, { paddingBottom: BottomTabInset + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.patientName}>{userName}</Text>
            <Text style={styles.headerSub}>How are you feeling today?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              activeOpacity={0.75}
              onPress={() => router.push(action.href as any)}
            >
              <Ionicons name={action.icon} size={28} color={TEAL} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Upcoming appointments</Text>
        {appointmentsContent}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 16,
    marginBottom: 28,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  patientName: { fontSize: 28, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
  headerSub: { fontSize: 14, color: "#6b7280" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: TEAL },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 14 },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  actionCard: {
    width: "47%",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  actionLabel: { fontSize: 14, fontWeight: "500", color: "#374151" },

  emptyCard: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: "#9ca3af" },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  emptyButtonText: { color: TEAL, fontWeight: "700", fontSize: 14 },
});
