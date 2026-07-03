process.env.TZ = process.env.TZ || "Asia/Kolkata"; // hospital-local time for all Date math

require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const validateEnv = require("./config/validateEnv");
const runSeeders = require("./utils/seed");
const syncIndexes = require("./utils/syncIndexes");

const PORT = process.env.PORT || 5000;

const start = async () => { // NOSONAR - top-level await is unavailable in CommonJS modules
  // Refuse to boot with a missing/weak secret rather than serving forgeable tokens
  try {
    validateEnv();
  } catch (err) {
    console.error("Environment validation failed:", err.message);
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }

  // Reconcile indexes (drops legacy unique indexes relaxed for soft-delete reuse)
  try {
    await syncIndexes();
    console.log("Index sync complete");
  } catch (err) {
    console.error("Index sync failed (continuing to start server):", err);
  }

  // Seed on startup; non-fatal so a transient seeding error doesn't take the API down
  try {
    await runSeeders();
    console.log("Seeding complete");
  } catch (err) {
    console.error("Startup seeding failed (continuing to start server):", err);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
