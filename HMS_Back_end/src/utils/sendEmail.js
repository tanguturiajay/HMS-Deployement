const axios = require("axios");
const https = require("node:https");

const sendEmail = async ({ to, subject, html }) => {

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    // Accept a single address string or an array of addresses
    const recipients = Array.isArray(to)
        ? to.map((email) => ({ email }))
        : [{ email: to }];

    await axios.post(
        "https://api.brevo.com/v3/smtp/email",

        {
            sender: {
                email: process.env.EMAIL_USER,
            },

            to: recipients,

            subject,

            htmlContent: html,
        },

        {
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "Content-Type": "application/json",
            },

            httpsAgent: agent
        }
    );
};

module.exports = sendEmail;