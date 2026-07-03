import { Text } from "react-native";

// Red required-field marker; nests inside a label <Text>
export function RequiredMark() {
  return <Text style={{ color: "#ef4444", fontWeight: "600" }}>{" *"}</Text>;
}
