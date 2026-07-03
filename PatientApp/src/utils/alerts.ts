import { Alert, AlertButton } from "react-native";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";

/** Extracts a displayable message from any thrown value. */
export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : MESSAGES.GENERIC_ERROR;
}

/** Shows a caught API/runtime error in a native alert. */
export function showError(err: unknown, title: string = ALERT_TITLES.ERROR): void {
  Alert.alert(title, errorMessage(err));
}

/** Shows a success alert; optional buttons drive post-success navigation. */
export function showSuccess(
  message: string,
  title: string = ALERT_TITLES.SUCCESS,
  buttons?: AlertButton[],
): void {
  Alert.alert(title, message, buttons);
}
