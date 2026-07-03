// Centralized email templates

const frontendUrl = () => {
  let url = process.env.FRONTEND_URL || "http://localhost:4200";
  while (url.endsWith("/")) url = url.slice(0, -1);
  return url;
};

const loginUrl = () => `${frontendUrl()}/login`;

// Patient mobile deep link base with an ensured trailing slash so paths append cleanly
const patientAppUrl = () => {
  const url = process.env.PATIENT_APP_URL || "hmsapp://";
  return url.endsWith("/") ? url : `${url}/`;
};

const patientLoginUrl = () => `${patientAppUrl()}login`;

// Shared wrapper so every email has a consistent signature/branding
const wrap = (innerHtml) => `
  ${innerHtml}
  <p>
    Regards,
    <br />
    HMS Team
  </p>
`;

const loginButton = (label = "Login to HMS") => `
  <p>
    <a href="${loginUrl()}">${label}</a>
  </p>
`;

// Login link for patient emails — opens the patient mobile app, not the staff web
const patientLoginButton = (label = "Open the HMS App") => `
  <p>
    <a href="${patientLoginUrl()}">${label}</a>
  </p>
`;

// Formats a date (Date or ISO string) for display in emails, date-only
const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Employee account created by an admin/owner — sends login credentials
const employeeCredentials = ({ username, temporaryPassword }) => ({
  subject: "HMS Employee Account Created",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your employee account has been created successfully.</p>
    <p><strong>Username:</strong> ${username}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    <p>Please login using the link below and change your password immediately.</p>
    ${loginButton()}
  `),
});

// Admin account created by an owner — sends login credentials
const adminCredentials = ({ username, temporaryPassword }) => ({
  subject: "HMS Admin Account Created",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your admin account has been created successfully.</p>
    <p><strong>Username:</strong> ${username}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    <p>Please login using the link below and change your password immediately.</p>
    ${loginButton()}
  `),
});

// Patient account created — sends login credentials
const patientCredentials = ({ email, temporaryPassword }) => ({
  subject: "HMS Patient Account Created",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your patient account has been created successfully.</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    <p>Please login using the link below and change your password immediately.</p>
    ${patientLoginButton("Patient Login")}
  `),
});

// Self-registered employee was approved by an admin
const accountApproved = () => ({
  subject: "HMS Employee Account Approved",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your employee account has been approved. You can login to HMS.</p>
    ${loginButton()}
  `),
});

// Self-registered employee was rejected by an admin
const accountRejected = () => ({
  subject: "HMS Employee Account Registration Rejected",
  html: wrap(`
    <h2>HMS Registration Request Rejected</h2>
    <p>
      Your registration has been rejected.
      Please contact the administrator/support team for more details.
    </p>
  `),
});

// Notify admins that a new employee has self-registered and needs review
const registrationRequest = ({ name, employeeCode, department, designation }) => ({
  subject: "New Employee Registration Request",
  html: wrap(`
    <h2>New Employee Registration Request</h2>
    <p>A new employee has submitted a registration request and is awaiting approval.</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Employee Code:</strong> ${employeeCode}</p>
    <p><strong>Department:</strong> ${department}</p>
    <p><strong>Designation:</strong> ${designation}</p>
    <p>Please review the request from the admin dashboard.</p>
    ${loginButton("Open Admin Dashboard")}
  `),
});

// Notify admins that an employee requested a profile change
const profileChangeRequest = ({ name, employeeCode }) => ({
  subject: "Employee Profile Change Request",
  html: wrap(`
    <h2>Profile Change Request</h2>
    <p>
      ${name} (${employeeCode}) has requested changes to their profile and is
      awaiting approval.
    </p>
    <p>Please review the request from the admin dashboard.</p>
    ${loginButton("Open Admin Dashboard")}
  `),
});

// Admin approves profile change request- notification send to employee
const profileChangeApproved = () => ({
  subject: "Profile Change Request Approved",
  html: wrap(`
    <h2>Profile Change Approved</h2>
    <p>Your requested profile changes have been approved and applied.</p>
  `),
});

// Admin rejects profile change request- notification send to employee
const profileChangeRejected = () => ({
  subject: "Profile Change Request Rejected",
  html: wrap(`
    <h2>Profile Change Rejected</h2>
    <p>
      Your requested profile changes have been rejected.
      Please contact the administrator for more details.
    </p>
  `),
});

// Appointment bookedby employee (Admin or Receptionist)- notification send to patient
const appointmentScheduled = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
}) => ({
  subject: "Appointment Scheduled",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your appointment has been created successfully.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
  `),
});

// Appointment updated by employee(Admin or Receptionist)- notification send to patient
const appointmentUpdated = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
}) => ({
  subject: "Appointment Updated",
  html: wrap(`
    <h2>Appointment Updated</h2>
    <p>Your appointment details have been updated.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
  `),
});

// Appointment canceled by employee(Admin or Receptionist)- notification send to patient
const appointmentCanceled = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
  cancellationReason,
}) => ({
  subject: "Appointment Cancelled",
  html: wrap(`
    <h2>Appointment Cancelled</h2>
    <p>Your appointment has been cancelled.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
    ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ""}
    <p>If you believe this was a mistake, please contact us or visit the hospital.</p>
  `),
});

// Doctor finalized a medical record- notification sent to patient
const diagnosisReportAvailable = ({ patientName }) => ({
  subject: "Diagnosis Report Available",
  html: wrap(`
    <h2>Diagnosis Report Available</h2>
    ${patientName ? `<p>Dear ${patientName},</p>` : ""}
    <p>Your diagnosis report has been completed. Please log in to the application to view your medical record details.</p>
    ${patientLoginButton("Patient Login")}
  `),
});

// Appointment marked unattended- notification sent to patient
const appointmentUnattended = ({ patientName }) => ({
  subject: "Appointment Marked Unattended",
  html: wrap(`
    <h2>Appointment Marked Unattended</h2>
    ${patientName ? `<p>Dear ${patientName},</p>` : ""}
    <p>Your scheduled appointment was marked as unattended because you were not present for the consultation. Please contact the hospital if you believe this was done in error.</p>
  `),
});

// Admin/Owner/Receptionist created a DRAFT medical record- notification sent to assigned doctor
const medicalRecordVerificationRequired = ({
  doctorName,
  patientName,
  patientUHID,
  appointmentId,
  creatorRole,
  creatorName,
}) => ({
  subject: "Medical Record Requires Verification",
  html: wrap(`
    <h2>Medical Record Requires Verification</h2>
    ${doctorName ? `<p>Dear Dr. ${doctorName},</p>` : ""}
    <p>A draft medical record has been created and requires your verification.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Patient UHID:</strong> ${patientUHID}</p>
    <p><strong>Appointment ID:</strong> ${appointmentId}</p>
    <p><strong>Created By:</strong> ${creatorRole} ${creatorName}</p>
    <p>Please log in to review, correct if needed, and finalize the record.</p>
    ${loginButton("Open Dashboard")}
  `),
});

// Admin/Owner/Receptionist updated a DRAFT medical record- notification sent to assigned doctor
const medicalRecordVerificationUpdated = ({
  doctorName,
  patientName,
  patientUHID,
  appointmentId,
  creatorRole,
  creatorName,
}) => ({
  subject: "Medical Record Updated - Verification Required",
  html: wrap(`
    <h2>Medical Record Updated</h2>
    ${doctorName ? `<p>Dear Dr. ${doctorName},</p>` : ""}
    <p>A draft medical record has been updated and requires your verification.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Patient UHID:</strong> ${patientUHID}</p>
    <p><strong>Appointment ID:</strong> ${appointmentId}</p>
    <p><strong>Updated By:</strong> ${creatorRole} ${creatorName}</p>
    <p>Please log in to review, correct if needed, and finalize the record.</p>
    ${loginButton("Open Dashboard")}
  `),
});

// Password reset request by employee- email with resetToken embedded in url is sent to the employee
const passwordReset = ({ resetToken }) => ({
  subject: "HMS Password Reset Request",
  html: wrap(`
    <h2>HMS Password Reset</h2>
    <p>Use the link below to reset your password.</p>
    <p>
      <a href="${frontendUrl()}/reset-password?token=${resetToken}">
        Reset Password
      </a>
    </p>
    <p>This reset link expires in 15 minutes.</p>
    <p>If you did not request this, ignore this email.</p>
  `),
});

// Patient app password reset; emails a one-time code, no link
const patientPasswordResetCode = ({ resetCode }) => ({
  subject: "HMS Password Reset Code",
  html: wrap(`
    <h2>HMS Password Reset</h2>
    <p>Use the code below in the HMS patient app to reset your password.</p>
    <p style="font-size: 24px; letter-spacing: 4px;"><strong>${resetCode}</strong></p>
    <p>This code expires in 15 minutes.</p>
    <p>If you did not request this, ignore this email.</p>
  `),
});

module.exports = {
  frontendUrl,
  loginUrl,
  patientAppUrl,
  patientLoginUrl,
  employeeCredentials,
  adminCredentials,
  patientCredentials,
  accountApproved,
  accountRejected,
  registrationRequest,
  profileChangeRequest,
  profileChangeApproved,
  profileChangeRejected,
  appointmentScheduled,
  appointmentUpdated,
  appointmentCanceled,
  diagnosisReportAvailable,
  appointmentUnattended,
  medicalRecordVerificationRequired,
  medicalRecordVerificationUpdated,
  passwordReset,
  patientPasswordResetCode,
};