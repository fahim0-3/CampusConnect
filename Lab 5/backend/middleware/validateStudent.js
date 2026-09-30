/**
 * Request-body validation.
 *
 * These rules and messages are carried over verbatim from the Lab 3
 * in-memory implementation. Swapping the storage layer to MongoDB must not
 * change what a client sees, so the 400 Bad Request envelope produced here is
 * byte-for-byte the same envelope Lab 3 produced.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email) => EMAIL_REGEX.test(String(email).trim());

function badRequest(res, errors) {
  return res.status(400).json({
    status: 400,
    error: "Bad Request",
    message: "Validation failed",
    errors,
    timestamp: new Date().toISOString()
  });
}

/** Full-payload validation used by POST /students and PUT /students/:id. */
function validateStudentInput(req, res, next) {
  const { name, email, course, semester } = req.body || {};
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push({ field: "name", message: "Name is required and cannot be empty" });
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    errors.push({
      field: "email",
      message: "A valid email address is required (e.g. user@example.com)"
    });
  }

  if (!course || typeof course !== "string" || course.trim().length === 0) {
    errors.push({ field: "course", message: "Course is required and cannot be empty" });
  }

  const semesterNum = Number(semester);
  if (
    semester === undefined ||
    semester === null ||
    semester === "" ||
    isNaN(semesterNum) ||
    !Number.isInteger(semesterNum) ||
    semesterNum < 1 ||
    semesterNum > 8
  ) {
    errors.push({
      field: "semester",
      message: "Semester must be a positive integer between 1 and 8"
    });
  }

  if (errors.length > 0) {
    return badRequest(res, errors);
  }

  next();
}

/** Partial-payload validation used by PATCH /students/:id. */
function validateStudentPatch(req, res, next) {
  const { name, email, course, semester } = req.body || {};
  const errors = [];

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    errors.push({ field: "name", message: "Name cannot be empty" });
  }

  if (email !== undefined && (typeof email !== "string" || !isValidEmail(email))) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  if (course !== undefined && (typeof course !== "string" || course.trim().length === 0)) {
    errors.push({ field: "course", message: "Course cannot be empty" });
  }

  if (semester !== undefined) {
    const semesterNum = Number(semester);
    if (
      isNaN(semesterNum) ||
      !Number.isInteger(semesterNum) ||
      semesterNum < 1 ||
      semesterNum > 8
    ) {
      errors.push({
        field: "semester",
        message: "Semester must be a positive integer between 1 and 8"
      });
    }
  }

  if (Object.keys(req.body || {}).length === 0) {
    errors.push({
      field: "body",
      message: "At least one field must be supplied for a partial update"
    });
  }

  if (errors.length > 0) {
    return badRequest(res, errors);
  }

  next();
}

module.exports = {
  EMAIL_REGEX,
  isValidEmail,
  badRequest,
  validateStudentInput,
  validateStudentPatch
};
