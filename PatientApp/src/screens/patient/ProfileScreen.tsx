import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";
import { errorMessage, showError, showSuccess } from "@/utils/alerts";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/AuthStore";
import { RequiredMark } from "@/components/common/RequiredMark";
import { BottomTabInset, KeyboardScrollPadding } from "@/constants/theme";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getMyProfile, updateMyProfile } from "@/services/patientService";
import { getInitials } from "@/utils/format";
import type { Patient } from "@/services/types";

const TEAL = "#2e9466";

const ProfileScreen = () => {
  const { logout } = useAuthStore();
  const router = useRouter();
  const guarded = useGuardedRouter();

  // Logout and redirect in the tap handler so it fires reliably
  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read-only identity fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [uhid, setUhid] = useState("");

  // Editable contact fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [houseName, setHouseName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("");
  const [postCode, setPostCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // Snapshot of the editable fields as last loaded/saved, for dirty detection.
  const initialRef = useRef({
    email: "",
    phone: "",
    houseName: "",
    houseNumber: "",
    city: "",
    postCode: "",
    contactName: "",
    relationship: "",
    contactNumber: "",
  });

  const hydrate = (p: Patient) => {
    setName(p.name || "");
    setGender(p.gender || "");
    setDob(p.dob ? String(p.dob).slice(0, 10) : "");
    setUhid(p.UHID || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setHouseName(p.address?.houseName || "");
    setHouseNumber(p.address?.houseNumber || "");
    setCity(p.address?.city || "");
    setPostCode(p.address?.postCode || "");
    setContactName(p.emergencyContact?.contactName || "");
    setRelationship(p.emergencyContact?.relationship || "");
    setContactNumber(p.emergencyContact?.contactNumber || "");
    initialRef.current = {
      email: p.email || "",
      phone: p.phone || "",
      houseName: p.address?.houseName || "",
      houseNumber: p.address?.houseNumber || "",
      city: p.address?.city || "",
      postCode: p.address?.postCode || "",
      contactName: p.emergencyContact?.contactName || "",
      relationship: p.emergencyContact?.relationship || "",
      contactNumber: p.emergencyContact?.contactNumber || "",
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProfile();
        hydrate(data.patient);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateMyProfile({
        phone: phone.trim(),
        email: email.trim(),
        address: {
          houseName: houseName.trim(),
          houseNumber: houseNumber.trim(),
          city: city.trim(),
          postCode: postCode.trim(),
        },
        emergencyContact: {
          contactName: contactName.trim(),
          relationship: relationship.trim(),
          contactNumber: contactNumber.trim(),
        },
      });
      hydrate(data.patient);
      showSuccess(MESSAGES.PROFILE_UPDATED, ALERT_TITLES.SAVED);
    } catch (err) {
      showError(err, ALERT_TITLES.UPDATE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  // Dirty when any editable field differs from the last loaded/saved snapshot.
  const init = initialRef.current;
  const isDirty =
    email !== init.email ||
    phone !== init.phone ||
    houseName !== init.houseName ||
    houseNumber !== init.houseNumber ||
    city !== init.city ||
    postCode !== init.postCode ||
    contactName !== init.contactName ||
    relationship !== init.relationship ||
    contactNumber !== init.contactNumber;
  useUnsavedChanges(isDirty);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: BottomTabInset + KeyboardScrollPadding },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      <SafeAreaView edges={["top"]}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(name || "P")}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <Text style={styles.profileId}>Patient ID · {uhid}</Text>
        </View>

        {/* Read-only identity */}
        <Text style={styles.sectionTitle}>Identity</Text>
        <View style={styles.readonlyCard}>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyLabel}>Gender</Text>
            <Text style={styles.readonlyValue}>{gender || "—"}</Text>
          </View>
          <View style={styles.readonlyDivider} />
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyLabel}>Date of birth</Text>
            <Text style={styles.readonlyValue}>{dob || "—"}</Text>
          </View>
        </View>

        {/* Editable contact info */}
        <Text style={styles.sectionTitle}>Contact information</Text>
        <View style={styles.formCard}>
          <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" />

          <Text style={styles.subHeading}>Address</Text>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Field label="House name" value={houseName} onChange={setHouseName} />
            </View>
            <View style={styles.halfField}>
              <Field label="House number" value={houseNumber} onChange={setHouseNumber} />
            </View>
          </View>
          <View style={styles.halfRow}>
            <View style={styles.halfField}>
              <Field label="City" value={city} onChange={setCity} />
            </View>
            <View style={styles.halfField}>
              <Field label="Post code" value={postCode} onChange={setPostCode} />
            </View>
          </View>

          <Text style={styles.subHeading}>Emergency contact</Text>
          <Field label="Contact name" value={contactName} onChange={setContactName} />
          <Field label="Relationship" value={relationship} onChange={setRelationship} />
          {/* Contact number — full width so all digits stay visible */}
          <Field label="Contact number" value={contactNumber} onChange={setContactNumber} keyboardType="phone-pad" />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, (saving || !isDirty) && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving || !isDirty}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save changes"}</Text>
        </TouchableOpacity>

        {/* Change password */}
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => guarded.push("/change-password")}
        >
          <Ionicons name="lock-closed-outline" size={18} color={TEAL} />
          <Text style={styles.secondaryButtonText}>Change password</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
};

// Small labelled input used throughout the editable form
function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
  required = true,
}: Readonly<{
  label: string;
  value: string;
  onChange: (t: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
  required?: boolean;
}>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}{required ? <RequiredMark /> : null}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, backgroundColor: "#fff" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 16,
  },
  errorText: { color: "#ef4444", fontSize: 15, textAlign: "center", paddingHorizontal: 24 },

  profileHeader: { alignItems: "center", paddingTop: 32, paddingBottom: 24 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: TEAL },
  profileName: { fontSize: 22, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
  profileEmail: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  profileId: { fontSize: 13, color: "#9ca3af" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 14 },

  readonlyCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  readonlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  readonlyDivider: { height: 1, backgroundColor: "#f3f4f6" },
  readonlyLabel: { fontSize: 14, color: "#6b7280" },
  readonlyValue: { fontSize: 15, fontWeight: "600", color: "#1f2937" },

  formCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 20,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 10,
  },
  fieldGroup: { marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 6 },
  fieldInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
    marginBottom: 12,
  },
  halfRow: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },

  saveButton: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "600", color: TEAL },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
});
