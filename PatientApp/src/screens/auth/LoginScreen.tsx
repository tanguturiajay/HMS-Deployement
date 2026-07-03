import { Textbox } from "@/components/common/textbox";
import { loginPatient } from "@/services/authService";
import { useIsFocused, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ALERT_TITLES } from "@/constants/messages";
import { showError } from "@/utils/alerts";
import { getEmailError, getRequiredError } from "@/utils/validation";
import { useAuthStore } from "../../store/AuthStore";
import { styles } from "./styles/LoginScreen.style";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();
  const isFocused = useIsFocused();

  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) {
      slideAnim.setValue(30);
      opacityAnim.setValue(0);
      setTouched({ email: false, password: false });
      return;
    }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [isFocused, slideAnim, opacityAnim]);

  const errors = {
    email: getEmailError(email),
    password: getRequiredError(password),
  };

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const data = await loginPatient(email.trim(), password);
      await login(data.accessToken, data.refreshToken);
      // Admin-provisioned accounts must set a real password before using the app
      router.replace(data.patient.mustChangePassword ? "/change-password" : "/");
    } catch (err) {
      showError(err, ALERT_TITLES.LOGIN_FAILED);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      <View style={styles.brandSection}>
        <Text style={styles.appName}>MediCare+</Text>
        <Text style={styles.heroText}>{"Your health,\nin your hands"}</Text>
        <Text style={styles.subtitle}>Book appointments, track your care</Text>
      </View>

      <Animated.View
        style={[
          styles.formBox,
          { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        ]}
      >
        <View style={styles.inputRow}>
          <Textbox
            label="Email address"
            required
            placeholder="you@email.com"
            value={email}
            onChangeText={setEmail}
            onBlur={() => touch("email")}
            autoCapitalize="none"
            icon="mail-outline"
            keyboardType="email-address"
            error={touched.email ? errors.email : undefined}
          />
        </View>

        <View style={styles.inputRow}>
          <Textbox
            label="Password"
            required
            placeholder="••••••••"
            value={password}
            icon="lock-closed-outline"
            onChangeText={setPassword}
            onBlur={() => touch("password")}
            secureToggle
            error={touched.password ? errors.password : undefined}
          />
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push("/forgot-password")}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? "Signing in…" : "Sign in"}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAwareScrollView>
  );
};

export default LoginScreen;
