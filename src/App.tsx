import { useState, useEffect, useCallback } from "react";
import type { User, CreateUserDto } from "./types/user";
import { userService } from "./services/userService";
import { UserForm } from "./components/UserForm";
import { UserList } from "./components/UserList";
import "./App.css";

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (userData: CreateUserDto) => {
    await userService.createUser(userData);
    await fetchUsers();
  };

  const handleUpdateUser = async (userData: CreateUserDto) => {
    if (!editingUser) return;
    await userService.updateUser(editingUser._id, userData);
    setEditingUser(null);
    await fetchUsers();
  };

  const handleDeleteUser = async (id: string) => {
    await userService.deleteUser(id);
    await fetchUsers();
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSubmit = async (userData: CreateUserDto) => {
    if (editingUser) {
      await handleUpdateUser(userData);
    } else {
      await handleCreateUser(userData);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>User Management</h1>
        <p>MongoDB CRUD Operations with NestJS & React</p>
      </header>

      <main>
        {error && <div className="error-banner">{error}</div>}

        <div className="container">
          <div className="form-section">
            <UserForm
              onSubmit={handleSubmit}
              editingUser={editingUser}
              onCancel={handleCancelEdit}
            />
          </div>

          <div className="list-section">
            <UserList
              users={users}
              onEdit={handleEdit}
              onDelete={handleDeleteUser}
              loading={loading}
            />
          </div>
        </div>
      </main>

      <footer>
        <p>Backend: NestJS + MongoDB | Frontend: React + Vite</p>
      </footer>
    </div>
  );
}

export default App;
