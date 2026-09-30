const mongoose = require("mongoose");

const MAX_ATTEMPTS = 5;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectDatabase(defaultDb = "order_db") {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://mongodb:27017/order_db";
  const dbName = process.env.MONGODB_DB_NAME || defaultDb;

  mongoose.set("strictQuery", true);

  const options = {
    dbName,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    retryReads: true,
    maxPoolSize: 10
  };

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(uri, options);
      console.log(`[Order Service] Connected to database: ${dbName} at ${mongoose.connection.host}`);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) break;
      const waitMs = attempt * 1500;
      console.warn(`[Order Service] DB connection attempt ${attempt}/${MAX_ATTEMPTS} failed. Retrying in ${waitMs / 1000}s...`);
      await sleep(waitMs);
    }
  }

  if (lastError) {
    console.error("[Order Service] Failed to connect to MongoDB:", lastError.message);
    throw lastError;
  }

  return mongoose.connection;
}

module.exports = { connectDatabase };
