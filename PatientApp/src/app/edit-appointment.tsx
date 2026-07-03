import AppointmentForm from "@/components/appointment/AppointmentForm";
import { useLocalSearchParams } from "expo-router";

// Reschedule screen; appointmentDate route param is sliced to YYYY-MM-DD for the form
export default function EditAppointment() {
  const { appointmentId, doctorEmployeeId, appointmentDate, timeSlot } =
    useLocalSearchParams<{
      appointmentId: string;
      doctorEmployeeId: string;
      appointmentDate: string;
      timeSlot: string;
    }>();

  const date = appointmentDate ? String(appointmentDate).slice(0, 10) : "";

  return (
    <AppointmentForm
      mode="edit"
      appointmentId={appointmentId}
      initialDoctorCode={doctorEmployeeId}
      initialDate={date}
      initialTimeSlot={timeSlot}
    />
  );
}
