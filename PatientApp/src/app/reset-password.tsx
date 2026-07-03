import { useRouter } from "expo-router";
import PasswordScreen from "@/components/common/PasswordScreen";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";
import { resetPassword } from "@/services/authService";
import { showSuccess } from "@/utils/alerts";

export default function ResetPassword() {
  const router = useRouter();

  return (
    <PasswordScreen
      title="Reset password"
      subtitle="Enter the reset code from your email and choose a new password."
      topField={{
        label: "Reset code",
        placeholder: "Enter the 8-character code",
        icon: "key-outline",
        autoCapitalize: "none",
        autoCorrect: false,
      }}
      submitLabel="Reset password"
      submittingLabel="Resetting…"
      errorTitle={ALERT_TITLES.RESET_FAILED}
      onSubmit={async (resetCode, newPassword, confirmPassword) => {
        await resetPassword(resetCode.trim(), newPassword, confirmPassword);
        showSuccess(MESSAGES.PASSWORD_RESET, ALERT_TITLES.SUCCESS, [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
      }}
    />
  );
}
