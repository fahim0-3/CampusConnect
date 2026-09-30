import { useEffect, useState } from "react";

const EMPTY = { name: "", email: "", course: "", semester: "" };

// Mirrors the backend regex so the client rejects obviously bad input before
// spending a round trip, without ever becoming the only line of defence.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side validation. Deliberately the same four rules the API enforces:
 * the server stays authoritative, this only shortens the feedback loop.
 */
function validate({ name, email, course, semester }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = "Name is required and cannot be empty";
  }

  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Enter a valid email address (e.g. user@example.com)";
  }

  if (!course.trim()) {
    errors.course = "Course is required and cannot be empty";
  }

  const sem = Number(semester);
  if (semester === "" || !Number.isInteger(sem) || sem < 1 || sem > 8) {
    errors.semester = "Semester must be a whole number between 1 and 8";
  }

  return errors;
}

/**
 * One component serving both POST /students and PUT /students/{id}.
 * `editing` being null means "add mode"; a student object means "edit mode".
 */
export default function StudentForm({
  editing,
  onSubmit,
  onCancelEdit,
  serverErrors = [],
  submitting = false
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  // Load the selected student into the form whenever edit mode is entered or
  // a different row is chosen.
  useEffect(() => {
    if (editing) {
      setValues({
        name: editing.name ?? "",
        email: editing.email ?? "",
        course: editing.course ?? "",
        semester: String(editing.semester ?? "")
      });
    } else {
      setValues(EMPTY);
    }
    setErrors({});
    setTouched(false);
  }, [editing]);

  // Field-level errors returned by the API on a 400/409 are merged in so they
  // appear inline, next to the field the server actually complained about.
  const serverFieldErrors = serverErrors.reduce((acc, e) => {
    if (e.field) acc[e.field] = e.message;
    return acc;
  }, {});

  const errorFor = (field) => errors[field] || serverFieldErrors[field];

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched) {
      setErrors(validate(next));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }

    onSubmit({
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      course: values.course.trim(),
      semester: Number(values.semester)
    });
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>{editing ? `Edit student #${editing.id}` : "Add a new student"}</h2>
        <p className="panel__hint">
          {editing
            ? "Saving sends PUT /students/{id} and then reloads the list from the server."
            : "Saving sends POST /students and then reloads the list from the server."}
        </p>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form__row">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={values.name}
            onChange={handleChange}
            placeholder="Aarav Patel"
            aria-invalid={Boolean(errorFor("name"))}
          />
          {errorFor("name") && <p className="field-error">{errorFor("name")}</p>}
        </div>

        <div className="form__row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            placeholder="aarav@example.com"
            aria-invalid={Boolean(errorFor("email"))}
          />
          {errorFor("email") && <p className="field-error">{errorFor("email")}</p>}
        </div>

        <div className="form__row">
          <label htmlFor="course">Course</label>
          <input
            id="course"
            name="course"
            type="text"
            value={values.course}
            onChange={handleChange}
            placeholder="Computer Science"
            aria-invalid={Boolean(errorFor("course"))}
          />
          {errorFor("course") && <p className="field-error">{errorFor("course")}</p>}
        </div>

        <div className="form__row">
          <label htmlFor="semester">Semester</label>
          <input
            id="semester"
            name="semester"
            type="number"
            min="1"
            max="8"
            value={values.semester}
            onChange={handleChange}
            placeholder="5"
            aria-invalid={Boolean(errorFor("semester"))}
          />
          {errorFor("semester") && (
            <p className="field-error">{errorFor("semester")}</p>
          )}
        </div>

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting
              ? "Saving..."
              : editing
                ? "Save changes"
                : "Add student"}
          </button>

          {editing && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCancelEdit}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
