import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <svg
              fill="none"
              stroke="currentColor"
              className="w-7 h-7 text-amber-500"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-display font-bold text-surface-50">
            StockFlow
          </h1>
          <p className="text-base text-surface-400 mt-1">
            Sistema de gestión de stock
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-900/80 border border-surface-800 rounded-2xl p-6 backdrop-blur-sm shadow-2xl space-y-4"
        >
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="text-base text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Iniciar sesión
          </Button>

          <div className="flex items-center justify-between text-sm text-surface-400">
            <span>Acceso para tu equipo</span>
            <Link
              to="/reset-password"
              className="text-amber-400 transition-colors hover:text-amber-300"
            >
              Tengo código de recuperación
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
