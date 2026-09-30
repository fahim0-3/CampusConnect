require("dotenv").config();

const mongoose = require("mongoose");

/**
 * Fast, read-only Atlas connectivity check. Writes nothing.
 *
 * Run it with `npm run check` before anything else. It separates the three
 * failure modes that otherwise all look like "it does not work":
 *   - the URI is missing or malformed
 *   - the credentials are wrong
 *   - the cluster is reachable but this machine's IP is not allowlisted
 */
async function check() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("FAIL  MONGODB_URI is not set.");
    console.error("      Copy .env.example to .env and paste your Atlas connection string.");
    process.exit(1);
  }

  if (uri.includes("<db_password>")) {
    console.error("FAIL  The connection string still contains the literal <db_password>.");
    console.error("      Replace it - angle brackets included - with your database user's password.");
    process.exit(1);
  }

  // Never print the URI itself: it contains the password.
  const host = uri.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, "").split("/")[0];
  console.log(`Connecting to ${host} ...`);

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || "soa_lab4",
      serverSelectionTimeoutMS: 15000
    });

    const admin = mongoose.connection.db.admin();
    await admin.command({ ping: 1 });

    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log(`OK    Connected to database "${mongoose.connection.name}"`);
    console.log(
      `OK    Collections present: ${collections.length ? collections.map((c) => c.name).join(", ") : "(none yet - run npm run seed)"}`
    );
    console.log("\nAtlas is reachable. You can now run `npm run seed` and `npm start`.");

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    const message = String(err.message || err);
    console.error(`FAIL  ${message}\n`);

    if (/tlsv1 alert internal error|SSL alert number 80/i.test(message)) {
      console.error("DIAGNOSIS  Atlas accepted the TCP connection then rejected the TLS handshake.");
      console.error("           That is what Atlas does when your IP is not on the allowlist.");
      console.error("           Fix: Atlas -> Network Access -> ADD IP ADDRESS ->");
      console.error("           ALLOW ACCESS FROM ANYWHERE (0.0.0.0/0) -> Confirm.");
      console.error("           Wait until the entry shows Active, then run this again.");
    } else if (/bad auth|Authentication failed/i.test(message)) {
      console.error("DIAGNOSIS  The cluster was reached but the username or password is wrong.");
      console.error("           Fix: Atlas -> Database Access -> Edit -> Edit Password.");
    } else if (/querySrv ENOTFOUND|getaddrinfo/i.test(message)) {
      console.error("DIAGNOSIS  The cluster hostname could not be resolved.");
      console.error("           Re-copy the connection string from Atlas -> Connect -> Drivers.");
    } else if (/timed out|ETIMEDOUT/i.test(message)) {
      console.error("DIAGNOSIS  No response. Either the IP allowlist is missing the current IP,");
      console.error("           or this network blocks outbound port 27017. Try a phone hotspot.");
    }

    process.exit(1);
  }
}

check();
