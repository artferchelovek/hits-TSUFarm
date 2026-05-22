import { apiRequest } from "./client.ts";

interface AuthResponse {
  token: string;
  user: { id: number; username: string; email: string };
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("POST", "/auth/login", { email, password });
}

export function register(
  username: string,
  email: string,
  password: string,
) {
  return apiRequest<AuthResponse>("POST", "/auth/register", {
    username,
    email,
    password,
  });
}
