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
import {
  AppointmentRecordState,
  getMedicalRecordByAppointment,
} from "@/services/medicalRecordService";

const TEAL = "#2e9466";

// Opened when a patient taps a COMPLETED appointment to show the finalized record or inline text while a draft is prepared
export default function AppointmentRecordScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [result, setResult] = useState<AppointmentRecordState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const data = await getMedicalRecordByAppointment(appointmentId);
      setResult(data);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  let body: React.ReactNode;
  if (loading) {
    body = <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />;
  } else if (result?.state === "FINALIZED" && result.medicalRecord) {
    body = (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: BottomTabInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <MedicalRecordDetails record={result.medicalRecord} />
      </ScrollView>
    );
  } else if (result?.state === "DRAFT") {
    // Inline page text only — no alert/toast/popup
    body = (
      <View style={styles.messageWrap}>
        <Text style={styles.messageText}>Report generation is still in process.</Text>
      </View>
    );
  } else {
    body = (
      <View style={styles.messageWrap}>
        <Text style={styles.messageText}>
          No medical record is available for this appointment.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Medical Record</Text>
        <View style={styles.backButton} />
      </SafeAreaView>
      {body}
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
  messageWrap: { paddingHorizontal: 24, paddingTop: 48, alignItems: "center" },
  messageText: { fontSize: 15, color: "#6b7280", textAlign: "center", lineHeight: 22 },
});
