/**
 * The one place the React client learns where the REST API lives.
 *
 * Every request path in src/api/studentApi.js is built from this constant, so
 * no component ever contains a hard-coded URL. Change VITE_API_BASE_URL in
 * .env (or supply it in the deployment environment) and the whole client
 * moves to a different backend.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

/** Resource path segment, kept separate so the base URL stays reusable. */
export const STUDENTS_PATH = "/students";
