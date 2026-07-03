const jwt = require("jsonwebtoken");

// Attaches employee identity when a valid token is available
const attachEmployeeOptional = (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"],
                ignoreExpiration: true
            });

            if (payload.type === "EMPLOYEE" && payload.employeeCode) {
                req.user = payload;
            }
        } catch {
            // Ignore invalid tokens and continue unauthenticated
        }
    }

    next();
};

module.exports = attachEmployeeOptional;
