import Ionicons from "@expo/vector-icons/Ionicons";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabInset } from "@/constants/theme";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";
import { showError } from "@/utils/alerts";
import AppointmentForm from "@/components/appointment/AppointmentForm";
import AppointmentCard from "@/components/appointment/AppointmentCard";
import { useNavGuard } from "@/store/navGuard";
import {
  AppointmentsData,
  cancelAppointment,
  getMyAppointments,
} from "@/services/appointmentService";
import type { Appointment, AppointmentStatus } from "@/services/types";

const TEAL = "#2e9466";
const PAGE_SIZE = 10;

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  BOOKED: "#2e9466",
  COMPLETED: "#6b7280",
  CANCELED: "#ef4444",
  UNATTENDED: "#d97706",
};

type TopTab = "book" | "list";

type Filter = "All" | AppointmentStatus;
const FILTERS: Filter[] = [
  "All",
  "BOOKED",
  "COMPLETED",
  "CANCELED",
  "UNATTENDED",
];

// True once the appointment slot start time has passed after which cancel and reschedule are no longer allowed
function startTimePassed(appt: Appointment): boolean {
  const start = (appt.timeSlot || "").split("-")[0];
  const [hh, mm] = (start || "").split(":").map(Number);
  const startAt = new Date(appt.appointmentDate);
  if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
    startAt.setHours(hh, mm, 0, 0);
  }
  return startAt.getTime() <= Date.now();
}

// Optimistically flips a single appointment to CANCELED across all cached pages
function markAppointmentCanceled(
  data: InfiniteData<AppointmentsData> | undefined,
  id: string,
): InfiniteData<AppointmentsData> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((pg) => ({
      ...pg,
      appointments: pg.appointments.map((a) =>
        a.appointmentId === id
          ? { ...a, status: "CANCELED" as AppointmentStatus }
          : a,
      ),
    })),
  };
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TopTab>("list");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  // Cancellation modal state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [reason, setReason] = useState("");

  const confirmLeave = useNavGuard((s) => s.confirmLeave);

  // Per-filter infinite query; React Query caches each filter independently
  const status = activeFilter === "All" ? undefined : activeFilter;
  const query = useInfiniteQuery({
    queryKey: ["myAppointments", activeFilter],
    queryFn: ({ pageParam }) => getMyAppointments(status, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.appointments) ?? [];
  const loading = query.isLoading;
  const loadingMore = query.isFetchingNextPage;

  useEffect(() => {
    if (query.error) showError(query.error);
  }, [query.error]);

  // Silent background refresh of the active filter on focus only when stale so a quick return reuses the cached list
  useRefetchOnFocusIfStale(query);

  // Switching filters just swaps the query key; cached data renders instantly
  const changeFilter = (f: Filter) => {
    if (f !== activeFilter) setActiveFilter(f);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query.refetch]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  // Switching away from a dirty booking form prompts via the shared nav guard
  const switchTab = async (next: TopTab) => {
    if (next === tab) return;
    if (!(await confirmLeave())) return;
    setTab(next);
  };

  // After booking, jump to the list and refresh all cached appointment filters
  const handleBooked = useCallback(() => {
    setTab("list");
    setActiveFilter("All");
    queryClient.invalidateQueries({ queryKey: ["myAppointments"] });
  }, [queryClient]);

  const openCancel = (appt: Appointment) => {
    setCancelTarget(appt);
    setReason("");
  };

  // Optimistic cancel that flips the row to CANCELED across cached pages and rolls back on error then reconciles on settle
  const cancelMutation = useMutation({
    mutationFn: ({ id, cancellationReason }: { id: string; cancellationReason: string }) =>
      cancelAppointment(id, cancellationReason),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["myAppointments"] });
      const prev = queryClient.getQueriesData<InfiniteData<AppointmentsData>>({
        queryKey: ["myAppointments"],
      });
      queryClient.setQueriesData<InfiniteData<AppointmentsData>>(
        { queryKey: ["myAppointments"] },
        (old) => markAppointmentCanceled(old, id),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      ctx?.prev?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      showError(err, ALERT_TITLES.CANCEL_FAILED);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["myAppointments"] }),
  });
  const cancelling = cancelMutation.isPending;

  const confirmCancel = () => {
    if (!cancelTarget) return;
    if (!reason.trim()) {
      Alert.alert(ALERT_TITLES.REASON_REQUIRED, MESSAGES.CANCEL_REASON_REQUIRED);
      return;
    }
    cancelMutation.mutate({
      id: cancelTarget.appointmentId,
      cancellationReason: reason.trim(),
    });
    setCancelTarget(null);
  };

  const reschedule = (appt: Appointment) => {
    router.push({
      pathname: "/edit-appointment",
      params: {
        appointmentId: appt.appointmentId,
        doctorEmployeeId: appt.doctorEmployeeId,
        appointmentDate: appt.appointmentDate,
        timeSlot: appt.timeSlot,
      },
    });
  };

  // Tapping a completed appointment opens its medical record (or in-progress text)
  const openRecord = (appt: Appointment) => {
    router.push({
      pathname: "/appointment-record",
      params: { appointmentId: appt.appointmentId },
    });
  };

  const renderItem = ({ item: appt }: { item: Appointment }) => {
    const card = (
      <AppointmentCard
        appointment={appt}
        statusColor={STATUS_COLORS[appt.status]}
      >
        {appt.status === "BOOKED" && !startTimePassed(appt) && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.8}
              onPress={() => openCancel(appt)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rescheduleButton}
              activeOpacity={0.8}
              onPress={() => reschedule(appt)}
            >
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}

        {appt.status === "CANCELED" && appt.cancellationReason ? (
          <Text style={styles.cancelReason}>
            Reason: {appt.cancellationReason}
          </Text>
        ) : null}
      </AppointmentCard>
    );

    if (appt.status === "COMPLETED") {
      return (
        <TouchableOpacity activeOpacity={0.85} onPress={() => openRecord(appt)}>
          {card}
        </TouchableOpacity>
      );
    }
    return card;
  };

  const filtersHeader: ReactNode = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersRow}
    >
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
          onPress={() => changeFilter(f)}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.filterPillText,
              activeFilter === f && styles.filterPillTextActive,
            ]}
          >
            {f}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // List-tab body: spinner on first load, otherwise the paginated list
  const listView = loading ? (
    <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
  ) : (
    <FlatList
      data={items}
      keyExtractor={(item) => item.appointmentId}
      renderItem={renderItem}
      ListHeaderComponent={filtersHeader}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: BottomTabInset + 24 },
      ]}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      removeClippedSubviews
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No appointments found</Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={TEAL} style={{ marginVertical: 16 }} />
        ) : null
      }
    />
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.screenTitle}>Appointments</Text>

        {/* Top-level tabs: book a new appointment / browse existing ones */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, tab === "book" && styles.segmentActive]}
            onPress={() => switchTab("book")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, tab === "book" && styles.segmentTextActive]}>
              Book Appointment
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, tab === "list" && styles.segmentActive]}
            onPress={() => switchTab("list")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, tab === "list" && styles.segmentTextActive]}>
              My Appointments
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {tab === "book" ? (
        <AppointmentForm mode="book" embedded onDone={handleBooked} />
      ) : (
        listView
      )}

      {/* Cancellation reason modal */}
      <Modal
        visible={cancelTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel appointment</Text>
            <Text style={styles.modalSub}>
              Tell us why you're cancelling this appointment.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for cancellation"
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                <Text style={styles.modalSecondaryText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimary, cancelling && { opacity: 0.6 }]}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                <Text style={styles.modalPrimaryText}>
                  {cancelling ? "Cancelling…" : "Cancel appointment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, backgroundColor: "#fff" },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1f2937",
    paddingTop: 20,
    marginBottom: 12,
  },

  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: TEAL },
  segmentText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  segmentTextActive: { color: "#fff", fontWeight: "700" },

  filtersRow: { gap: 10, paddingRight: 4, marginBottom: 20 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  filterPillActive: { borderColor: TEAL, backgroundColor: "#f0fdf4" },
  filterPillText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  filterPillTextActive: { color: TEAL, fontWeight: "700" },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
  rescheduleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
  },
  rescheduleButtonText: { fontSize: 14, fontWeight: "600", color: TEAL },
  cancelReason: { marginTop: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#9ca3af" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 6 },
  modalSub: { fontSize: 14, color: "#6b7280", marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1f2937",
    minHeight: 70,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  modalSecondaryText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  modalPrimary: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  modalPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
