/**
 * Renders the result of GET /students.
 *
 * Loading, error and empty are three distinct visual states rather than one
 * blank table, so the user can always tell the difference between "still
 * fetching", "the request failed" and "the database really is empty".
 */
export default function StudentList({
  students,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
  deletingId
}) {
  if (loading) {
    return (
      <section className="panel">
        <h2>Students</h2>
        <p className="state state--loading">Loading students...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Students</h2>
        <p className="state state--error">{error}</p>
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Students</h2>
        <p className="panel__hint">
          {students.length} record{students.length === 1 ? "" : "s"} loaded from
          MongoDB Atlas via <code>GET /students</code>
        </p>
      </header>

      {students.length === 0 ? (
        <p className="state state--empty">
          No students yet. Add one with the form to create the first document in
          the collection.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Course</th>
                <th scope="col">Semester</th>
                <th scope="col" className="table__actions-head">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td data-label="ID">{student.id}</td>
                  <td data-label="Name">{student.name}</td>
                  <td data-label="Email">{student.email}</td>
                  <td data-label="Course">{student.course}</td>
                  <td data-label="Semester">{student.semester}</td>
                  <td data-label="Actions" className="table__actions">
                    <button
                      type="button"
                      className="btn btn--small"
                      onClick={() => onEdit(student)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--danger"
                      onClick={() => onDelete(student)}
                      disabled={deletingId === student.id}
                    >
                      {deletingId === student.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
