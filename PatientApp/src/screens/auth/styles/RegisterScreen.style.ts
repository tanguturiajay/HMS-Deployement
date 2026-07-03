import { StyleSheet } from "react-native";
import { KeyboardScrollPadding } from "@/constants/theme";

export const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingBottom: KeyboardScrollPadding,
  },
  brandSection: {
    paddingTop: 64,
    paddingBottom: 32,
  },
  appName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 14,
  },
  heroText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
  },
  formBox: {
    alignSelf: "stretch",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  genderOptionActive: {
    borderColor: "#2e9466",
    backgroundColor: "#f0fdf4",
  },
  genderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  genderTextActive: {
    color: "#2e9466",
  },
  halfRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: "#2e9466",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 14,
  },
  footerLink: {
    color: "#2e9466",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 14,
  },
  fieldError: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 2,
  },
});
