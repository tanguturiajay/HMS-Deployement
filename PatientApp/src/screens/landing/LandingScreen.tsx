import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabInset } from "@/constants/theme";

const TEAL = "#2e9466";

const FEATURES = [
  {
    icon: "calendar-outline" as const,
    title: "Book appointments",
    desc: "Schedule visits with your doctor in seconds",
  },
  {
    icon: "document-text-outline" as const,
    title: "Track your care",
    desc: "View appointment history and status at a glance",
  },
  {
    icon: "person-outline" as const,
    title: "Manage your profile",
    desc: "Keep your details and emergency contacts up to date",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Secure & private",
    desc: "Your health data is encrypted and always safe",
  },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: BottomTabInset + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView edges={["top"]}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="medical" size={38} color="#fff" />
          </View>
          <Text style={styles.appName}>MediCare+</Text>
          <Text style={styles.heroText}>{"Your health,\nin your hands."}</Text>
          <Text style={styles.subtitle}>
            Book appointments, track your care, and manage your health — all in one place.
          </Text>
        </View>

        {/* Feature grid */}
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Ionicons name={f.icon} size={22} color={TEAL} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Create an account</Text>
        </TouchableOpacity>

        {/* Text link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to MediCare+?  </Text>
          <TouchableOpacity onPress={() => router.push("/register")} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Register now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 24, backgroundColor: "#fff" },

  brandSection: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 36,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    boxShadow: "0 4px 8px rgba(46, 148, 102, 0.3)",
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 23,
    paddingHorizontal: 8,
  },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    width: "47%",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },

  primaryButton: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    boxShadow: "0 3px 6px rgba(46, 148, 102, 0.25)",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    marginBottom: 22,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: TEAL,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  footerText: { fontSize: 14, color: "#6b7280" },
  footerLink: { fontSize: 14, fontWeight: "700", color: TEAL },
});
