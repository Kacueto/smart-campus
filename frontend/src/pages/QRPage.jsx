import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCode } from "react-qr-code";
import { IconArrowLeft, IconRefresh, IconCopy, IconCheck } from "@tabler/icons-react";
import { generateQRToken } from "../services/api";

export default function QRPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { aulaId, materia, aula } = location.state || {};

  const [qrToken,     setQrToken]     = useState(null);
  const [expira,      setExpira]      = useState(30);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [copiado,     setCopiado]     = useState(false);

  const copiarToken = () => {
    navigator.clipboard.writeText(qrToken);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const fetchQR = useCallback(async () => {
    if (!aulaId) return;
    try {
      setError(null);
      const data = await generateQRToken(aulaId);
      setQrToken(data.qr_token);
      setExpira(30);
    } catch {
      setError("No se pudo generar el QR. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [aulaId]);

  // Generar QR al cargar
  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  // Refrescar cada 30s automáticamente
  useEffect(() => {
    if (!qrToken) return;
    const interval = setInterval(fetchQR, 30000);
    return () => clearInterval(interval);
  }, [qrToken, fetchQR]);

  // Countdown
  useEffect(() => {
    if (!qrToken) return;
    const interval = setInterval(() => {
      setExpira((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [qrToken]);

  if (!aulaId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <p className="text-lg font-bold">No se especificó un aula.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-orange-300 underline">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 gap-8">

      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <IconArrowLeft size={20} />
          <span className="text-sm font-bold">Volver</span>
        </button>
        <p className="text-sm font-bold text-slate-400">Smart Campus</p>
      </div>

      {/* Info clase */}
      <div className="text-center">
        <p className="text-2xl font-bold text-orange-300">{materia ?? "Mi QR"}</p>
        <p className="text-sm text-slate-400 mt-1">{aula ?? ""}</p>
      </div>

      {/* QR */}
      <div className="bg-white rounded-2xl p-8 shadow-2xl">
        {loading ? (
          <div className="w-72 h-72 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Generando QR...</p>
          </div>
        ) : error ? (
          <div className="w-72 h-72 flex flex-col items-center justify-center gap-4">
            <p className="text-rose-500 text-sm text-center">{error}</p>
            <button onClick={fetchQR} className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <IconRefresh size={16} />
              Reintentar
            </button>
          </div>
        ) : (
          <QRCode value={qrToken} size={300} level="L" />
        )}
      </div>

      {/* Countdown + copiar */}
      {qrToken && !error && (
        <div className="text-center grid gap-3">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${expira > 10 ? "bg-green-400" : "bg-orange-400"} animate-pulse`} />
            <p className="text-sm font-bold text-slate-300">
              QR válido por <span className={expira <= 10 ? "text-orange-400" : "text-green-400"}>{expira}s</span>
            </p>
          </div>
          <button
            onClick={copiarToken}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded border border-slate-600 text-sm font-bold text-slate-300 hover:bg-slate-800 transition"
          >
            {copiado ? <IconCheck size={15} className="text-green-400" /> : <IconCopy size={15} />}
            {copiado ? "Token copiado" : "Copiar token"}
          </button>
          <p className="text-xs text-slate-500">Se renueva automáticamente</p>
        </div>
      )}

      {/* Instrucción */}
      <p className="text-xs text-slate-500 text-center max-w-xs">
        Muestra este código frente a la cámara del aula para registrar tu asistencia
      </p>
    </div>
  );
}
