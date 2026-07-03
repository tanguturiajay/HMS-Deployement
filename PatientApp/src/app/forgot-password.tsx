import { Textbox } from "@/components/common/textbox";
import { forgotPassword } from "@/services/authService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";
import { showError, showSuccess } from "@/utils/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import { pwStyles as styles } from "@/styles/password.style";
import { getEmailError } from "@/utils/validation";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailError = getEmailError(email);

  const handleSubmit = async () => {
    setTouched(true);
    if (emailError) return;

    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      showSuccess(MESSAGES.FORGOT_PASSWORD_SENT, ALERT_TITLES.CHECK_EMAIL, [
        { text: "Enter reset code", onPress: () => router.push("/reset-password") },
      ]);
    } catch (err) {
      showError(err);
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

        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset code.
        </Text>

        <View style={styles.form}>
          <Textbox
            label="Email address"
            required
            placeholder="you@email.com"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setTouched(true)}
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            error={touched ? emailError : undefined}
          />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.disabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Sending…" : "Send reset code"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/reset-password")}>
            <Text style={styles.link}>I already have a reset code</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
}
