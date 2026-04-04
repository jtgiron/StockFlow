import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { MpMerchant } from "../types";

export default function SettingsPage() {
  const [merchants, setMerchants] = useState<MpMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const data = await api.get<MpMerchant[]>("/mp/merchants");
      setMerchants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar comerciantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const data = await api.get<{ authorization_url: string }>("/mp/oauth/authorize");
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar conexión");
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("¿Desconectar esta cuenta de MercadoPago?")) return;
    try {
      await api.delete(`/mp/merchants/${id}`);
      await fetchMerchants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desconectar");
    }
  };

  const handleSetupPos = async (id: number) => {
    try {
      setError(null);
      await api.post(`/mp/merchants/${id}/setup-pos`);
      await fetchMerchants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear caja");
    }
  };

  const activeMerchant = merchants.find((m) => m.is_active);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-50">Configuración</h1>

      {/* MercadoPago Section */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-surface-50">MercadoPago</h2>
            <p className="text-sm text-surface-400">Conectá tu cuenta para cobrar con QR</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-surface-400 text-sm">Cargando...</div>
        ) : activeMerchant ? (
          <div className="space-y-4">
            {/* Connected merchant card */}
            <div className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${activeMerchant.token_valid ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <p className="text-surface-100 font-medium">
                      {activeMerchant.merchant_name || `MP User ${activeMerchant.mp_user_id}`}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      ID: {activeMerchant.mp_user_id} &middot;{" "}
                      {activeMerchant.token_valid ? (
                        <span className="text-green-400">Token válido</span>
                      ) : (
                        <span className="text-red-400">Token expirado — reconectá la cuenta</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(activeMerchant.id)}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Desconectar
                </button>
              </div>

              {/* POS Status */}
              <div className="mt-3 pt-3 border-t border-surface-700">
                {activeMerchant.mp_external_pos_id ? (
                  <div className="flex items-center gap-2 text-sm text-surface-400">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Caja QR configurada: <span className="text-surface-300 font-mono">{activeMerchant.mp_external_pos_id}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-400">Caja QR no configurada</span>
                    <button
                      onClick={() => handleSetupPos(activeMerchant.id)}
                      className="text-sm bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Crear caja
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code */}
            {activeMerchant.qr_image_url && (
              <div className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg">
                <p className="text-sm text-surface-300 font-medium mb-3">Código QR de la caja</p>
                <div className="flex items-start gap-4">
                  <img
                    src={activeMerchant.qr_image_url}
                    alt="QR MercadoPago"
                    className="w-48 h-48 rounded-lg bg-white p-2"
                  />
                  <div className="text-sm text-surface-400 space-y-2">
                    <p>Imprimí este QR y colocalo en la caja para que los clientes lo escaneen.</p>
                    <a
                      href={activeMerchant.qr_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Descargar QR
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="p-3 bg-sky-500/5 border border-sky-500/15 rounded-lg text-sm text-surface-400">
              Los pagos con QR se acreditarán directamente en la cuenta de MercadoPago conectada.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Conectá tu cuenta de MercadoPago para que tus clientes puedan pagar escaneando el código QR.
              El dinero se acredita directamente en tu cuenta.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {connecting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Conectando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                  </svg>
                  Conectar MercadoPago
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
