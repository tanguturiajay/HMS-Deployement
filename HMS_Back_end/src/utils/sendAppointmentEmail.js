const sendEmail = require("./sendEmail");

// Best-effort appointment notification; failures are logged, never thrown
const sendAppointmentEmail = async (to, template) => {
    try {
        await sendEmail({ to, ...template });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }
};

module.exports = sendAppointmentEmail;
