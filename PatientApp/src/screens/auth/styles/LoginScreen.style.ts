import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  brandSection: {
    paddingTop: 80,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 18,
  },
  heroText: {
    fontSize: 34,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 44,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#9ca3af",
  },
  formBox: {
    width: "100%",
  },
  inputRow: {
    marginBottom: 2,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: 2,
  },
  forgotPasswordText: {
    color: "#2e9466",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#2e9466",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
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
    marginTop: 8,
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
});
