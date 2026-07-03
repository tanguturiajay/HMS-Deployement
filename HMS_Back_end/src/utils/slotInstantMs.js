// Hospital timezone is Asia/Kolkata, a fixed +5:30 offset (no DST)
const TZ_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// Epoch ms of a HH:mm slot on the appointment day interpreted in hospital time regardless of server timezone
const slotInstantMs = (appointmentDate, hhmm) => {
  const [hour, minute] = (hhmm || "").split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return Number.NaN;
  }
  const d = new Date(appointmentDate);
  return (
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute) -
    TZ_OFFSET_MS
  );
};

// UTC midnight Date of the IST calendar day containing whenMs matching how appointmentDate values are stored
const istDayStart = (whenMs = Date.now()) => {
  const shifted = new Date(whenMs + TZ_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
};

module.exports = slotInstantMs;
module.exports.istDayStart = istDayStart;
module.exports.TZ_OFFSET_MS = TZ_OFFSET_MS;
