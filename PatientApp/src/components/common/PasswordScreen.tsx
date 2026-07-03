import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Textbox } from "@/components/common/textbox";
import { pwStyles as styles } from "@/styles/password.style";
import { showError } from "@/utils/alerts";
import {
  getConfirmPasswordError,
  getPasswordError,
  getRequiredError,
} from "@/utils/validation";

type TopField = Readonly<{
  label: string;
  placeholder: string;
  icon: string;
  secureToggle?: boolean;
  autoCapitalize?: "none";
  autoCorrect?: boolean;
}>;

type PasswordScreenProps = Readonly<{
  title: string;
  subtitle: string;
  // Screen-specific first field: current password or reset code
  topField: TopField;
  submitLabel: string;
  submittingLabel: string;
  errorTitle: string;
  onSubmit: (topValue: string, newPassword: string, confirmPassword: string) => Promise<void>;
}>;

// Shared chrome for the change/reset password screens
export default function PasswordScreen({
  title,
  subtitle,
  topField,
  submitLabel,
  submittingLabel,
  errorTitle,
  onSubmit,
}: PasswordScreenProps) {
  const router = useRouter();
  const [topValue, setTopValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({ top: false, newPassword: false, confirmPassword: false });
  const [submitting, setSubmitting] = useState(false);

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {
    top: getRequiredError(topValue),
    newPassword: getPasswordError(newPassword),
    confirmPassword: getConfirmPasswordError(confirmPassword, newPassword),
  };

  const handleSubmit = async () => {
    setTouched({ top: true, newPassword: true, confirmPassword: true });
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await onSubmit(topValue, newPassword, confirmPassword);
    } catch (err) {
      showError(err, errorTitle);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bottomOffset={24}>
      <SafeAreaView edges={["top"]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.form}>
          <Textbox
            label={topField.label}
            required
            placeholder={topField.placeholder}
            value={topValue}
            onChangeText={setTopValue}
            onBlur={() => touch("top")}
            icon={topField.icon}
            secureToggle={topField.secureToggle}
            autoCapitalize={topField.autoCapitalize}
            autoCorrect={topField.autoCorrect}
            error={touched.top ? errors.top : undefined}
          />
          <Textbox
            label="New password"
            required
            placeholder="Create a new password"
            value={newPassword}
            onChangeText={setNewPassword}
            onBlur={() => touch("newPassword")}
            icon="lock-closed-outline"
            secureToggle
            error={touched.newPassword ? errors.newPassword : undefined}
          />
          <Textbox
            label="Confirm password"
            required
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => touch("confirmPassword")}
            icon="lock-closed-outline"
            secureTextEntry
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
          />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.disabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? submittingLabel : submitLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
}
