import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { showError } from "@/utils/alerts";
import MedicalRecordDetails from "@/components/medical-record/MedicalRecordDetails";
import { getMedicalRecordById } from "@/services/medicalRecordService";
import type { MedicalRecord } from "@/services/types";

const TEAL = "#2e9466";

export default function MedicalRecordScreen() {
  const router = useRouter();
  const { medicalRecordId } = useLocalSearchParams<{ medicalRecordId: string }>();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!medicalRecordId) return;
    setLoading(true);
    try {
      const data = await getMedicalRecordById(medicalRecordId);
      setRecord(data.medicalRecord);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }, [medicalRecordId]);

  useEffect(() => {
    load();
  }, [load]);

  // Loaded-state body: the record details, or an empty state when none was found
  const recordBody = record ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: BottomTabInset + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <MedicalRecordDetails record={record} />
    </ScrollView>
  ) : (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
      <Text style={styles.emptyText}>Medical record not found</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Medical Record</Text>
        <View style={styles.backButton} />
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
      ) : (
        recordBody
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#9ca3af" },
});
