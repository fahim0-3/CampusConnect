import { useState } from "react";
import { ApiError, getStudent } from "../api/studentApi";

/**
 * Exercises GET /students/{id} on its own.
 *
 * The list view never produces a 404 because it only ever offers ids that
 * exist. This panel lets the user request an arbitrary id, which is how the
 * "404 -> Student not found" branch of the service contract is demonstrated
 * in the UI (try id 999).
 */
export default function StudentLookup() {
  const [id, setId] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!id.trim()) {
      setResult(null);
      setMessage({ tone: "error", text: "Enter a student ID to look up." });
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage(null);

    try {
      const student = await getStudent(id.trim());
      setResult(student);
      setMessage({ tone: "success", text: `200 OK - found student #${student.id}.` });
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      setMessage({
        tone: "error",
        text: apiError
          ? `${apiError.status || "Network"} - ${apiError.message}`
          : "Unable to load data. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Look up a single student</h2>
        <p className="panel__hint">
          Calls <code>GET /students/{"{id}"}</code>. Try <strong>999</strong> to see
          the 404 handling.
        </p>
      </header>

      <form className="lookup" onSubmit={handleSubmit}>
        <input
          type="text"
          value={id}
          onChange={(event) => setId(event.target.value)}
          placeholder="Student ID, e.g. 1"
          aria-label="Student ID"
        />
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "Searching..." : "Find"}
        </button>
      </form>

      {message && (
        <p className={`state state--${message.tone === "error" ? "error" : "ok"}`}>
          {message.text}
        </p>
      )}

      {result && (
        <dl className="lookup__result">
          <div>
            <dt>Name</dt>
            <dd>{result.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{result.email}</dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>{result.course}</dd>
          </div>
          <div>
            <dt>Semester</dt>
            <dd>{result.semester}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
