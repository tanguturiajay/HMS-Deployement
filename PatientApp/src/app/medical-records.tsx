import Ionicons from "@expo/vector-icons/Ionicons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRefetchOnFocusIfStale } from "@/hooks/useRefetchOnFocusIfStale";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabInset } from "@/constants/theme";
import { showError } from "@/utils/alerts";
import { formatApptDate } from "@/utils/format";
import { getMyMedicalRecords } from "@/services/medicalRecordService";
import type { MedicalRecordListItem } from "@/services/types";

const TEAL = "#2e9466";
const PAGE_SIZE = 10;

export default function MedicalRecordsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ["medicalRecords"],
    queryFn: ({ pageParam }) => getMyMedicalRecords(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.medicalRecords) ?? [];
  const loading = query.isLoading;
  const loadingMore = query.isFetchingNextPage;

  // Surface fetch errors (parity with the previous showError path)
  useEffect(() => {
    if (query.error) showError(query.error);
  }, [query.error]);

  // Silent background refresh on focus only when stale so a quick return reuses the cached list
  useRefetchOnFocusIfStale(query);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query.refetch]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const openRecord = (item: MedicalRecordListItem) => {
    router.push({
      pathname: "/medical-record",
      params: { medicalRecordId: item.medicalRecordId },
    });
  };

  const renderItem = ({ item }: { item: MedicalRecordListItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => openRecord(item)}
    >
      <View style={styles.iconBox}>
        <Ionicons name="document-text" size={20} color={TEAL} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>Dr. {item.doctorName}</Text>
        <Text style={styles.cardMeta}>{item.medicalRecordId}</Text>
        <Text style={styles.cardMeta}>
          Appointment {item.appointmentId}
          {item.created_at ? ` · ${formatApptDate(item.created_at)}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.screenTitle}>Medical Records</Text>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.medicalRecordId}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: BottomTabInset + 24 },
            items.length === 0 && styles.listEmpty,
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
              <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No medical records yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={TEAL} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, backgroundColor: "#fff" },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1f2937",
    paddingTop: 20,
    marginBottom: 12,
  },
  listContent: { paddingHorizontal: 20 },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0faf4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  cardMeta: { fontSize: 13, color: "#6b7280", marginTop: 1 },
  emptyState: { alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15, color: "#9ca3af" },
});
