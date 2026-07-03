// Linear-time email pattern; disjoint classes around the dot prevent backtracking blowup
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const PHONE_REGEX = /^(\+\d{1,3} )?\d{10}$/;
const NAME_REGEX = /^[a-zA-Z]+([ '-][a-zA-Z]+)*$/;

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, msg: "at least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), msg: "an uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), msg: "a lowercase letter" },
  { test: (p: string) => /\d/.test(p), msg: "a number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), msg: "a special character" },
];

export function getRequiredError(value: string): string | undefined {
  if (!value.trim()) return "Required";
  return undefined;
}

export function getEmailError(email: string): string | undefined {
  if (!email.trim()) return "Required";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address";
  return undefined;
}

export function getPasswordError(password: string): string | undefined {
  if (!password) return "Required";
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.msg);
  if (missing.length) return `Needs ${missing.join(", ")}`;
  return undefined;
}

export function getConfirmPasswordError(
  confirmPassword: string,
  password: string,
): string | undefined {
  if (!confirmPassword) return "Required";
  if (confirmPassword !== password) return "Passwords do not match";
  return undefined;
}

export function getPhoneError(
  phone: string,
  hint = "10 digits, optional +country code",
): string | undefined {
  if (!phone) return "Required";
  if (!PHONE_REGEX.test(phone)) return hint;
  return undefined;
}

export function getNameError(name: string): string | undefined {
  if (!name.trim()) return "Required";
  if (!NAME_REGEX.test(name.trim())) return "Only letters, spaces, hyphens, and apostrophes";
  return undefined;
}
