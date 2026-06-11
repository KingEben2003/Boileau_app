import { FiInbox, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import Spinner from "./Spinner";

export function LoadingState({ label = "Chargement…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = FiInbox, title = "Aucune donnée", message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
        <Icon size={26} />
      </div>
      <p className="font-bold text-gray-300">{title}</p>
      {message && <p className="text-sm text-gray-500 max-w-sm">{message}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
        <FiAlertTriangle size={26} />
      </div>
      <p className="font-bold text-gray-200">Impossible de charger les données</p>
      <p className="text-sm text-gray-500 max-w-md break-words">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2">
          <FiRefreshCw size={15} /> Réessayer
        </button>
      )}
    </div>
  );
}
