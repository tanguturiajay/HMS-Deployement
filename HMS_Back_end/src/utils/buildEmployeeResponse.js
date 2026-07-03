const buildEmployeeProfile = require("./buildEmployeeProfile");

const buildEmployeeResponse = (employees, users) => {

    // Build user lookup map
    const userMap = new Map();

    users.forEach((user) => {
        userMap.set(
            String(user.employeeCode),
            user
        );
    });

    // Merge employee + user data
    return employees.map((employee) => {

        const matchedUser =
            userMap.get(
                String(employee.employeeCode)
            );

        const profile = buildEmployeeProfile(employee);

        return {
            employee: profile,
            status: matchedUser?.status,
            roles: matchedUser?.roles,
            lastLoginAt: matchedUser?.lastLoginAt
        };
    });
};

module.exports = buildEmployeeResponse;