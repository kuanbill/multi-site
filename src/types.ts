export interface Site {
  id: string;
  name: string;
  domain: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  theme: {
    primaryColor: string;
    logo: string;
  };
}

export interface User {
  id: string;
  siteId: string;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface MenuItem {
  id: string;
  siteId: string;
  label: string;
  icon: string;
  path: string;
  parentId: string | null;
  order: number;
  visible: boolean;
  permission: string;
}

export interface DataRecord {
  id: string;
  siteId: string;
  collection: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DataCollection {
  id: string;
  siteId: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
}

export interface FieldDefinition {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  role: 'superadmin';
}

export type Page = 'dashboard' | 'sites' | 'users' | 'menus' | 'data' | 'preview';
