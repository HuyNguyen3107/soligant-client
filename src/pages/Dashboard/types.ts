// ─── USER TYPES ───────────────────────────────────────────────────────────────
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

// ─── PROFILE MODAL TYPES ──────────────────────────────────────────────────────
export interface ProfileForm {
  name: string;
  phone: string;
  address: string;
  avatar: string;
}

export interface PasswordForm {
  current: string;
  newPw: string;
  confirm: string;
}

export interface ShowPasswordState {
  current: boolean;
  newPw: boolean;
  confirm: boolean;
}

// ─── SIDEBAR TYPES ────────────────────────────────────────────────────────────
export type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  path?: string;
};

export type SidebarSection = {
  group: string;
  items: SidebarItem[];
};

// ─── STAT CARDS TYPES ─────────────────────────────────────────────────────────
export interface StatCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: React.ElementType;
  sparkData: number[];
  color: string;
}

// ─── USERS TAB TYPES ──────────────────────────────────────────────────────────
export interface RoleOption {
  _id: string;
  name: string;
  isSystem?: boolean;
}

export interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  customRole?: { _id: string; name: string };
  phone?: string;
  address?: string;
  avatar?: string;
  createdAt?: string;
}

export interface UserFormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  customRoleId: string;
}

// ─── ROLES TAB TYPES ──────────────────────────────────────────────────────────
export interface SysPerm {
  _id: string;
  key: string;
  label: string;
  group: string;
}

export interface CustomRole {
  _id: string;
  name: string;
  isSystem?: boolean;
  permissions: SysPerm[];
  createdAt?: string;
}

export interface RoleForm {
  name: string;
  permissionIds: string[];
}

// ─── TAB METADATA TYPES ───────────────────────────────────────────────────────
export interface TabMeta {
  title: string;
  description: string;
  keywords: string;
  path: string;
}

// ─── COLLECTIONS TAB TYPES ────────────────────────────────────────────────────
export interface CollectionRow {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  isActive: boolean;
  isFeatured: boolean;
  productsCount?: number;
  createdAt?: string;
}

export interface CollectionFormState {
  name: string;
  description: string;
  thumbnail: string;
  isActive: boolean;
  isFeatured: boolean;
}

// ─── CHART TYPES ──────────────────────────────────────────────────────────────
export interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface GoalItem {
  label: string;
  current: number;
  target: number;
  pct: number;
  color: string;
}
