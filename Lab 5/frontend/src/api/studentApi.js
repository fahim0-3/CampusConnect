import { API_BASE_URL, STUDENTS_PATH } from "../config";

/**
 * Error type that preserves the HTTP status alongside the message, so the UI
 * can react to the service contract (400 vs 404 vs 5xx) rather than guessing
 * from the text of an error string.
 *
 * `fieldErrors` carries the `errors[]` array the API returns on a 400, which
 * is what lets the form highlight the exact field the backend rejected.
 */
export class ApiError extends Error {
  constructor(status, message, fieldErrors = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const NETWORK_MESSAGE = "Unable to load data. Please try again.";

function url(path = "") {
  return `${API_BASE_URL}${STUDENTS_PATH}${path}`;
}

/**
 * Single choke point for every call. Translates the HTTP status code into an
 * ApiError the components can branch on.
 */
async function request(path, { method = "GET", body } = {}) {
  let response;

  try {
    response = await fetch(url(path), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkError) {
    // fetch() rejects on DNS failure, a refused connection, or a CORS block.
    throw new ApiError(0, NETWORK_MESSAGE);
  }

  if (response.status === 204) {
    return null;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.ok) {
    return payload;
  }

  switch (response.status) {
    case 400:
      throw new ApiError(
        400,
        payload?.message || "Validation failed",
        payload?.errors || []
      );

    case 404:
      throw new ApiError(404, "Student not found");

    case 409:
      throw new ApiError(
        409,
        payload?.errors?.[0]?.message || "A student with this email already exists",
        payload?.errors || []
      );

    default:
      throw new ApiError(response.status, NETWORK_MESSAGE);
  }
}

/** GET /students */
export async function listStudents() {
  const payload = await request("");
  return payload?.data ?? [];
}

/** GET /students/{id} */
export async function getStudent(id) {
  const payload = await request(`/${encodeURIComponent(id)}`);
  return payload?.data ?? null;
}

/** POST /students */
export async function createStudent(student) {
  const payload = await request("", { method: "POST", body: student });
  return payload?.data ?? null;
}

/** PUT /students/{id} */
export async function updateStudent(id, student) {
  const payload = await request(`/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: student
  });
  return payload?.data ?? null;
}

/** PATCH /students/{id} */
export async function patchStudent(id, changes) {
  const payload = await request(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes
  });
  return payload?.data ?? null;
}

/** DELETE /students/{id} */
export async function deleteStudent(id) {
  await request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}
