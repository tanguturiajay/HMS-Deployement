// Fail fast on missing or weak critical env vars before the server accepts traffic
const REQUIRED_VARS = [
    "MONGO_URI",
    "JWT_SECRET",
    "JWT_PATIENT_SECRET",
    "JWT_EXPIRES_IN",
    "REFRESH_TOKEN_EXPIRES_DAYS"
];

// reject anything trivially brute-forceable
const MIN_JWT_SECRET_LENGTH = 32;
const SECRET_VARS = ["JWT_SECRET", "JWT_PATIENT_SECRET"];

const validateEnv = () => {
    const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

    if (missing.length) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
    }

    const weakSecret = SECRET_VARS.find(
        (name) => process.env[name].length < MIN_JWT_SECRET_LENGTH
    );

    if (weakSecret) {
        throw new Error(
            `${weakSecret} must be at least ${MIN_JWT_SECRET_LENGTH} characters`
        );
    }
};

module.exports = validateEnv;
