import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatApptDate, getInitials } from "@/utils/format";
import type { Appointment } from "@/services/types";

const TEAL = "#2e9466";

type AppointmentCardProps = Readonly<{
  appointment: Appointment;
  statusColor?: string;
  // Extra rows (action buttons, cancellation reason) rendered below the summary
  children?: ReactNode;
}>;

export default function AppointmentCard({
  appointment,
  statusColor = TEAL,
  children,
}: AppointmentCardProps) {
  return (
    <View style={styles.apptCard}>
      <View style={styles.apptRow}>
        <View style={styles.apptAvatarBox}>
          <Text style={styles.apptAvatarText}>
            {getInitials(appointment.doctor?.name || "Dr")}
          </Text>
        </View>
        <View style={styles.apptInfo}>
          <Text style={styles.apptDoctor}>
            Dr. {appointment.doctor?.name || appointment.doctorEmployeeId}
          </Text>
          {appointment.doctor?.specialization ? (
            <Text style={styles.apptSpecialty}>{appointment.doctor.specialization}</Text>
          ) : null}
          <Text style={styles.apptDatetime}>
            {formatApptDate(appointment.appointmentDate)} · {appointment.timeSlot}
          </Text>
        </View>
        <Text style={[styles.statusBadge, { color: statusColor }]}>
          {appointment.status}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  apptCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    marginBottom: 12,
  },
  apptRow: { flexDirection: "row", alignItems: "center" },
  apptAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0faf4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  apptAvatarText: { fontSize: 13, fontWeight: "700", color: TEAL },
  apptInfo: { flex: 1 },
  apptDoctor: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  apptSpecialty: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  apptDatetime: { fontSize: 13, color: TEAL, fontWeight: "500" },
  statusBadge: { fontSize: 12, fontWeight: "700" },
});
