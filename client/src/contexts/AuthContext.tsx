import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../services/api";
import type { Profile, UserRole } from "../types";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
}

interface AuthContextType extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface LoginResponse {
  access_token: string;
  user: Profile & { email: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    role: null,
  });

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    api
      .get<Profile & { email: string }>("/auth/profile")
      .then((profile) => {
        setState({
          user: { id: profile.id, email: profile.email },
          profile,
          loading: false,
          role: profile.role,
        });
      })
      .catch(() => {
        api.setToken(null);
        setState({ user: null, profile: null, loading: false, role: null });
      });
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      api.setToken(data.access_token);
      const profile = data.user;
      setState({
        user: { id: profile.id, email: profile.email ?? email },
        profile,
        loading: false,
        role: profile.role,
      });
      return { error: null };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error de conexión";
      return { error: message };
    }
  }

  async function signOut() {
    api.setToken(null);
    setState({ user: null, profile: null, loading: false, role: null });
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        isAdmin: state.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
