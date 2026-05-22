import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getToken, setToken } from "../api/client.ts";
import * as authApi from "../api/auth.ts";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = getToken();
    if (saved) {
      setTokenState(saved);
      const payload = JSON.parse(atob(saved.split(".")[1]));
      setUser({ id: payload.userId, username: payload.username, email: "" });
    }
    setReady(true);

    const onLogout = () => {
      setTokenState(null);
      setUser(null);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ) => {
    const res = await authApi.register(username, email, password);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  };

  if (!ready) return null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
