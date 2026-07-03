// True when the appointment's weekday and time slot fall inside any availability window
const fitsAvailability = (availabilitySlots, appointmentDate, timeSlot) => {

    const day = new Date(appointmentDate)
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase();

    const [start, end] = (timeSlot || "").split("-");

    return (availabilitySlots || []).some(
        (w) => w.day === day && start >= w.startTime && end <= w.endTime
    );
};

module.exports = fitsAvailability;
