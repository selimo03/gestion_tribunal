import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617] p-6 font-['Outfit']">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-[2rem] flex items-center justify-center text-4xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">
                Une erreur est survenue
              </h1>
              <p className="text-slate-500 font-medium">
                Le système a rencontré une erreur inattendue. Vos données sont en sécurité.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <p className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-900 p-3 rounded-xl mt-3">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
