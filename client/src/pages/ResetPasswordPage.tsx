import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api, ApiError } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const minPasswordLength = 8;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("El email es obligatorio");
      return;
    }

    if (!resetCode.trim()) {
      setError("El código de recuperación es obligatorio");
      return;
    }

    if (newPassword.length < minPasswordLength) {
      setError(
        `La contraseña debe tener al menos ${minPasswordLength} caracteres`,
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ message?: string }>(
        "/auth/reset-password-with-code",
        {
          email,
          resetCode,
          newPassword,
        },
      );
      setSuccess(data?.message || "Contraseña actualizada correctamente");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err) {
      const nextMessage =
        err instanceof ApiError
          ? err.message
          : "No pudimos actualizar la contraseña";
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 px-4 py-8 text-surface-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-0 top-24 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-4xl items-center justify-center">
        <div className="w-full rounded-4xl border border-surface-800 bg-surface-900/85 p-8 shadow-2xl shadow-surface-950/60 backdrop-blur sm:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-teal-400">
                Nueva contraseña
              </p>
              <h1 className="mt-3 text-3xl font-display font-semibold text-surface-50">
                Ingresa tu código local y define tu nueva clave.
              </h1>
            </div>
            <div className="rounded-2xl border border-surface-800 bg-surface-950/70 px-4 py-3 text-sm text-surface-400">
              El código lo genera un administrador y vence automáticamente.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-3xl border border-surface-800 bg-surface-950/50 p-5 text-sm leading-7 text-surface-300">
              Pide el código al administrador. Es de un solo uso y se invalida
              al confirmar el cambio.
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
            <Input
              label="Código de recuperación"
              type="text"
              placeholder="000000"
              value={resetCode}
              onChange={(event) =>
                setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />

            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />

            {error && (
              <div className="sm:col-span-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="sm:col-span-2 rounded-2xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
                {success}
              </div>
            )}

            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <Button type="submit" loading={loading} className="min-w-48">
                Guardar contraseña
              </Button>
              <Link
                to="/login"
                className="text-sm text-surface-400 hover:text-surface-200"
              >
                Cancelar y volver al login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
