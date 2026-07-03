require("dotenv").config();

const mongoose = require("mongoose");

const seedNodes = require("./seedNodes");
const seedOwner = require("./seedOwner");

// Runs all seeders in order on the current connection; throws on the first failure
const runSeeders = async () => {
  await seedNodes();
  await seedOwner();
};

// Standalone entrypoint for `npm run seed:all` / postinstall: owns its own connection, fails fast
const runStandalone = async () => { // NOSONAR - top-level await is unavailable in CommonJS modules
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");
    await runSeeders();
    console.log("All seeders completed");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};

if (require.main === module) {
  runStandalone();
}

module.exports = runSeeders;
