import { useCallback, useEffect, useState } from "react";

import StudentList from "./components/StudentList";
import StudentForm from "./components/StudentForm";
import StudentLookup from "./components/StudentLookup";
import { API_BASE_URL } from "./config";
import {
  ApiError,
  createStudent,
  deleteStudent,
  listStudents,
  updateStudent
} from "./api/studentApi";

export default function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const [banner, setBanner] = useState(null);

  /**
   * Single source of truth for the table: always re-read from the API rather
   * than mutating local state after a write. It costs one extra request but
   * guarantees the screen shows what is actually in MongoDB, including the
   * server-assigned id and any normalisation the API applied.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await listStudents();
      setStudents(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Unable to load data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerErrors([]);
    setBanner(null);

    try {
      if (editing) {
        await updateStudent(editing.id, payload);
        setBanner({
          tone: "success",
          text: `Student #${editing.id} updated (200 OK).`
        });
        setEditing(null);
      } else {
        const created = await createStudent(payload);
        setBanner({
          tone: "success",
          text: `Student #${created.id} created (201 Created).`
        });
      }

      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Field-level messages go inline on the form; the banner explains why
        // nothing was saved.
        setServerErrors(err.fieldErrors);
        setBanner({
          tone: "error",
          text: "400 Bad Request - the server rejected this data. See the highlighted fields."
        });
      } else if (err instanceof ApiError && err.status === 409) {
        setServerErrors(err.fieldErrors);
        setBanner({ tone: "error", text: `409 Conflict - ${err.message}` });
      } else if (err instanceof ApiError && err.status === 404) {
        setBanner({
          tone: "error",
          text: "Student not found - it may have been deleted in another window."
        });
        setEditing(null);
        await refresh();
      } else {
        setBanner({
          tone: "error",
          text: "Unable to load data. Please try again."
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.name} (id ${student.id})? This removes the document from MongoDB.`
    );
    if (!confirmed) return;

    setDeletingId(student.id);
    setBanner(null);

    try {
      await deleteStudent(student.id);
      setBanner({
        tone: "success",
        text: `Student #${student.id} deleted (200 OK).`
      });

      if (editing?.id === student.id) {
        setEditing(null);
      }

      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setBanner({ tone: "error", text: "Student not found." });
        await refresh();
      } else {
        setBanner({
          tone: "error",
          text: "Unable to load data. Please try again."
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (student) => {
    setEditing(student);
    setServerErrors([]);
    setBanner(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Student Client</h1>
          <p className="app__subtitle">
            React web client &middot; Web Services &amp; SOA Laboratory, Lab 4
          </p>
        </div>
        <p className="app__base-url">
          API_BASE_URL <code>{API_BASE_URL}</code>
        </p>
      </header>

      {banner && (
        <p
          className={`banner banner--${banner.tone}`}
          role={banner.tone === "error" ? "alert" : "status"}
        >
          {banner.text}
          <button
            type="button"
            className="banner__close"
            onClick={() => setBanner(null)}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </p>
      )}

      <main className="app__grid">
        <div className="app__column">
          <StudentForm
            editing={editing}
            onSubmit={handleSubmit}
            onCancelEdit={() => {
              setEditing(null);
              setServerErrors([]);
            }}
            serverErrors={serverErrors}
            submitting={submitting}
          />
          <StudentLookup />
        </div>

        <div className="app__column app__column--wide">
          <StudentList
            students={students}
            loading={loading}
            error={loadError}
            onRetry={refresh}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        </div>
      </main>

      <footer className="app__footer">
        <p>
          This client never talks to MongoDB. Every operation goes through the
          REST API, which is the only component holding a database credential.
        </p>
      </footer>
    </div>
  );
}
