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

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="no-users">No users found. Create your first user!</div>
    );
  }

  return (
    <div className="user-list">
      <h2>User List</h2>
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
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.age || "-"}</td>
              <td>{user.phone || "-"}</td>
              <td>{user.address || "-"}</td>
              <td>
                <button onClick={() => onEdit(user)} className="edit-btn">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user._id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
