const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/RefreshTokens");

const REFRESH_TOKEN_BYTES = 48;
const DAY_MS = 24 * 60 * 60 * 1000;

// Refresh tokens are opaque, so we only ever store their sha256 hash
const hashToken = (raw) =>
    crypto.createHash("sha256").update(raw).digest("hex");

// Per domain signing secret so a patient token cannot be verified with the employee secret and domains rotate independently
const accessSecretForType = (type) =>
    type === "PATIENT" ? process.env.JWT_PATIENT_SECRET : process.env.JWT_SECRET;

// Short-lived stateless JWT carrying identity + the tokenVersion kill-switch
const signAccessToken = (payload) =>
    jwt.sign(payload, accessSecretForType(payload.type), {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN
    });

const refreshExpiryDate = () =>
    new Date(Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) * DAY_MS);

// Persists a hashed refresh token and returns the raw value while a missing familyId starts a new lineage
const issueRefreshToken = async ({ subjectType, subjectId, familyId, req }) => {
    const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");

    await RefreshToken.create({
        tokenHash: hashToken(raw),
        subjectType,
        subjectId,
        familyId: familyId || crypto.randomUUID(),
        expiresAt: refreshExpiryDate(),
        userAgent: req?.headers?.["user-agent"] || null,
        ip: req?.ip || null
    });

    return raw;
};

// Looks up a token by hash regardless of revocation so callers can attribute an action to its owner
const findByHash = (tokenHash) =>
    RefreshToken.findOne({ tokenHash });

// Returns the matched (pre-update) document so callers can audit who logged out
const revokeByHash = (tokenHash, replacedByHash = null) =>
    RefreshToken.findOneAndUpdate(
        { tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date(), replacedByHash } }
    );

const revokeFamily = (familyId) =>
    RefreshToken.updateMany(
        { familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );

// Kills every active session for a subject (used on password change/reset)
const revokeAllForSubject = (subjectType, subjectId) =>
    RefreshToken.updateMany(
        { subjectType, subjectId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );

// Validates and rotates a refresh token returning OK INVALID EXPIRED or REUSE_DETECTED
const rotateRefreshToken = async ({ rawToken, subjectType, req }) => {
    const record = await RefreshToken.findOne({
        tokenHash: hashToken(rawToken),
        subjectType
    });

    if (!record) {
        return { status: "INVALID" };
    }

    // Reuse of an already-consumed token signals theft; burn the whole family
    if (record.revokedAt) {
        await revokeFamily(record.familyId);
        return {
            status: "REUSE_DETECTED",
            subjectId: record.subjectId,
            familyId: record.familyId
        };
    }

    if (record.expiresAt <= new Date()) {
        return { status: "EXPIRED" };
    }

    const newRefreshToken = await issueRefreshToken({
        subjectType,
        subjectId: record.subjectId,
        familyId: record.familyId,
        req
    });

    await revokeByHash(record.tokenHash, hashToken(newRefreshToken));

    return {
        status: "OK",
        subjectId: record.subjectId,
        newRefreshToken
    };
};

module.exports = {
    hashToken,
    signAccessToken,
    issueRefreshToken,
    findByHash,
    revokeByHash,
    revokeFamily,
    revokeAllForSubject,
    rotateRefreshToken
};
