export default function Spinner({ size = 24, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Chargement"
    />
  );
}
