import type { User } from "../types/user";

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
}

export function UserList({ users, onEdit, onDelete, loading }: UserListProps) {
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await onDelete(id);
    }
  };

  return (
    <div className="user-list card">
      <div className="card-header">
        <span className="icon">👥</span>
        <h2>User List</h2>
        <span
          style={{ marginLeft: "auto", fontSize: "0.875rem", color: "#6b7280" }}
        >
          {users.length} user{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="no-users">
            No users found. Create your first user!
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Age</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td style={{ color: "#6b7280" }}>{user.email}</td>
                    <td>{user.age || "-"}</td>
                    <td>{user.phone || "-"}</td>
                    <td>{user.address || "-"}</td>
                    <td>
                      <div className="actions">
                        <button
                          onClick={() => onEdit(user)}
                          className="btn-icon btn-edit"
                          title="Edit user"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="btn-icon btn-delete"
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
