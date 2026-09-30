require("dotenv").config();

const { connectDatabase, disconnectDatabase } = require("../config/db");
const Student = require("../models/Student");
const Counter = require("../models/Counter");

/**
 * Loads the three students Lab 3 shipped as its in-memory dataset into Atlas.
 * Run once with `npm run seed` so the collection is not empty on first launch.
 * Existing documents are wiped first so the ids stay 1, 2, 3.
 */
const SEED_DATA = [
  {
    name: "Aarav Patel",
    email: "aarav@example.com",
    course: "Computer Science",
    semester: 5
  },
  {
    name: "Priya Sharma",
    email: "priya@example.com",
    course: "Information Technology",
    semester: 4
  },
  {
    name: "Rohan Gupta",
    email: "rohan.gupta@example.com",
    course: "Data Science",
    semester: 6
  }
];

async function seed() {
  await connectDatabase();

  await Student.deleteMany({});
  await Counter.deleteOne({ _id: "studentId" });

  for (const record of SEED_DATA) {
    const student = new Student(record);
    await student.save();
    console.log(`  seeded id=${student.id}  ${student.name}`);
  }

  // Make sure the unique index on email actually exists in Atlas.
  await Student.syncIndexes();
  console.log("Indexes synced (unique index on email).");

  console.log(`\nDone. ${SEED_DATA.length} students written to MongoDB Atlas.`);
  await disconnectDatabase();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
