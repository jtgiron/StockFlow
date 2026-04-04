import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";

export default function MpConnectedPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const error = searchParams.get("error");
  const merchantName = searchParams.get("name");
  const success = !error;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/settings", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-900 border border-surface-800 rounded-xl p-8 text-center">
        {success ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-surface-50 mb-2">Cuenta conectada</h1>
            <p className="text-surface-400 mb-1">
              <span className="text-surface-200 font-medium">{merchantName}</span> se conectó correctamente.
            </p>
            <p className="text-sm text-surface-500">
              Los pagos con QR se acreditarán en esta cuenta.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-surface-50 mb-2">Error al conectar</h1>
            <p className="text-sm text-red-400">{error}</p>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-surface-800">
          <p className="text-xs text-surface-500 mb-3">
            Redirigiendo a configuración en {countdown}s...
          </p>
          <button
            onClick={() => navigate("/settings", { replace: true })}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Ir ahora
          </button>
        </div>
      </div>
    </div>
  );
}
