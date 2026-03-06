export interface User {
  _id: string;
  name: string;
  email: string;
  age?: number;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  age?: number;
  phone?: string;
  address?: string;
}
