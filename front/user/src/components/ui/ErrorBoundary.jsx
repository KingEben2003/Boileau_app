import React from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
    // Brancher Sentry ici : Sentry.captureException(error, { extra: info });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleReset);
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <FiAlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white mb-1">Une erreur est survenue</h2>
            <p className="text-sm text-gray-400">
              {this.props.fallbackMessage || "Quelque chose s'est mal passé. Essayez de réinitialiser ou de rafraîchir la page."}
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <p className="text-xs text-red-400/70 mt-2 font-mono max-w-xs break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all text-sm"
          >
            <FiRefreshCw size={14} />
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
