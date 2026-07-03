const crypto = require("node:crypto");

const generateTemporaryPassword = ( length = 12 ) => {

    // Characters allowed in password
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "abcdefghijklmnopqrstuvwxyz" +
        "0123456789" +
        "@$!%*?&";

    let password = "";

    // Generate random characters
    for (let i = 0; i < length; i++) {

        const randomIndex =
            crypto.randomInt(
                0,
                characters.length
            );

        password += characters[randomIndex];
    }

    return password;
};

module.exports = generateTemporaryPassword;