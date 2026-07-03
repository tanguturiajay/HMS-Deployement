import { StyleSheet } from "react-native";

const TEAL = "#2e9466";

// Shared layout for the forgot/reset/change password screens.
export const pwStyles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  backBtn: { marginTop: 12, marginBottom: 8, padding: 4, alignSelf: "flex-start" },
  title: { fontSize: 28, fontWeight: "700", color: "#1f2937", marginTop: 12 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 8, marginBottom: 24 },
  form: { width: "100%" },
  primaryButton: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { color: TEAL, fontWeight: "600", fontSize: 14, textAlign: "center" },
  fieldError: { color: "#ef4444", fontSize: 12, marginTop: 4, marginBottom: 6, marginLeft: 2 },
});
