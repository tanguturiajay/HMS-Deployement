import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ConfirmModalType, useConfirmModal } from "@/store/confirmModal";

const ACCENT: Record<ConfirmModalType, { color: string; bg: string; icon: any }> = {
  danger: { color: "#ef4444", bg: "#fef2f2", icon: "alert-circle" },
  warning: { color: "#d97706", bg: "#fffbeb", icon: "warning" },
  success: { color: "#2e9466", bg: "#f0fdf4", icon: "checkmark-circle" },
  info: { color: "#2563eb", bg: "#eff6ff", icon: "information-circle" },
};

// Shared confirm dialog mounted once at the app root and driven by useConfirmModal
export default function ConfirmModal() {
  const { isOpen, config, confirm, cancel } = useConfirmModal();

  if (!config) return null;

  const accent = ACCENT[config.type ?? "danger"];

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={cancel}>
      <Pressable style={styles.overlay} onPress={cancel}>
        {/* Stop backdrop taps from closing when pressing the card itself. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconCircle, { backgroundColor: accent.bg }]}>
            <Ionicons name={accent.icon} size={26} color={accent.color} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{config.cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: accent.color }]}
              onPress={confirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{config.confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
