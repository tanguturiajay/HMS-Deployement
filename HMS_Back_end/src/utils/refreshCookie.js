// httpOnly refresh token cookie for the staff web app since mobile clients use the body based refresh token
const REFRESH_COOKIE_NAME = "refreshToken";
const DAY_MS = 24 * 60 * 60 * 1000;

// httpOnly blocks JS access and Secure requires HTTPS in production while path scopes it to the auth endpoints
const baseCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth"
});

const setRefreshCookie = (res, token) =>
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...baseCookieOptions(),
        maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) * DAY_MS
    });

const clearRefreshCookie = (res) =>
    res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());

module.exports = {
    REFRESH_COOKIE_NAME,
    setRefreshCookie,
    clearRefreshCookie
};
