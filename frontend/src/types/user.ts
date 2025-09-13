export interface User {
  id: string;
  email: string;
  name: string;
  strictModeEnabled: boolean;
  uninstallProtectionEnabled: boolean;
  createdAt: string;
}

export interface InsertUser {
  email: string;
  password: string;
  name: string;
}
