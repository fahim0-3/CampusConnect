const mongoose = require("mongoose");

/**
 * Opens the single shared connection to MongoDB Atlas.
 *
 * The SRV connection string is read from the MONGODB_URI environment variable
 * (see .env.example). Nothing about the URI is hard-coded here, so the same
 * build can be pointed at a local mongod, a shared Atlas cluster, or a cloud
 * deployment by changing one environment value.
 */
const MAX_ATTEMPTS = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectDatabase() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGO_URI or MONGODB_URI is not set. Set MONGO_URI in your environment or compose.yaml."
    );
  }

  mongoose.set("strictQuery", true);

  const options = {
    dbName: process.env.MONGODB_DB_NAME || "campusconnect",
    serverSelectionTimeoutMS: 15000,
    // Atlas fronts a three-node replica set. On a flaky link the TLS handshake
    // to one node can fail while the others are fine, so give the driver room
    // to try another node rather than giving up on the first error.
    retryWrites: true,
    retryReads: true,
    maxPoolSize: 10
  };

  // Initial connection is retried with backoff. Home and campus networks drop
  // the occasional TLS handshake to Atlas ("SSL alert number 80"), which is
  // transient - the next attempt usually succeeds. Without this the whole API
  // would refuse to start over a single dropped packet.
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(uri, options);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) break;

      const waitMs = attempt * 2000;
      console.warn(
        `MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed (${err.message.split("\n")[0]}). Retrying in ${waitMs / 1000}s...`
      );
      await sleep(waitMs);
    }
  }

  if (lastError) throw lastError;

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected  ->  host: ${host}  |  database: ${name}`);

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection lost.");
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase };
