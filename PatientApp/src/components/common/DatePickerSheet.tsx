import DateTimePicker, { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TEAL = "#2e9466";

type DatePickerSheetProps = Readonly<{
  visible: boolean;
  value: Date;
  title: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (selected: Date) => void;
  // Fired when the picker closes (Android select/dismiss, iOS Done)
  onClose: () => void;
}>;

// Platform-split date picker: Android native dialog, iOS bottom-sheet modal
export default function DatePickerSheet({
  visible,
  value,
  title,
  minimumDate,
  maximumDate,
  onChange,
  onClose,
}: DatePickerSheetProps) {
  const onValueChange = (_: DateTimePickerChangeEvent, selected: Date) => {
    if (Platform.OS === "android") onClose();
    onChange(selected);
  };

  if (Platform.OS === "android") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onValueChange={onValueChange}
        onDismiss={onClose}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={onValueChange}
            style={{ width: "100%" }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  pickerDone: { fontSize: 16, fontWeight: "700", color: TEAL },
});
