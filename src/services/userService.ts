import type { User, CreateUserDto } from "../types/user";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const USERS_ENDPOINT = `${API_BASE}/users`;

export const userService = {
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(USERS_ENDPOINT);
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    return response.json();
  },

  async getUserById(id: string): Promise<User> {
    const response = await fetch(`${USERS_ENDPOINT}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch user");
    }
    return response.json();
  },

  async createUser(userData: CreateUserDto): Promise<User> {
    const response = await fetch(USERS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create user");
    }
    return response.json();
  },

  async updateUser(
    id: string,
    userData: Partial<CreateUserDto>,
  ): Promise<User> {
    const response = await fetch(`${USERS_ENDPOINT}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      throw new Error("Failed to update user");
    }
    return response.json();
  },

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${USERS_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete user");
    }
  },
};
