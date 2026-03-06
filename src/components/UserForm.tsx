import { useState, useEffect } from "react";
import type { CreateUserDto, User } from "../types/user";

interface UserFormProps {
  onSubmit: (userData: CreateUserDto) => Promise<void>;
  editingUser?: User | null;
  onCancel?: () => void;
}

export function UserForm({ onSubmit, editingUser, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserDto>({
    name: "",
    email: "",
    age: undefined,
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || "",
        email: editingUser.email || "",
        age: editingUser.age,
        phone: editingUser.phone || "",
        address: editingUser.address || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        age: undefined,
        phone: "",
        address: "",
      });
    }
  }, [editingUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "age" ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData);
      if (!editingUser) {
        setFormData({
          name: "",
          email: "",
          age: undefined,
          phone: "",
          address: "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="user-form card">
      <div className="card-header">
        <span className="icon">{editingUser ? "✏️" : "➕"}</span>
        <h2>{editingUser ? "Edit User" : "Create User"}</h2>
      </div>

      <div className="card-body">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter full name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter email address"
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age || ""}
            onChange={handleChange}
            min="0"
            max="150"
            placeholder="Enter age"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address || ""}
            onChange={handleChange}
            placeholder="Enter address"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span
                  className="spinner"
                  style={{ width: 16, height: 16, borderWidth: 2 }}
                ></span>
                Saving...
              </>
            ) : editingUser ? (
              "Update User"
            ) : (
              "Create User"
            )}
          </button>
          {editingUser && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
