import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full bg-card rounded-2xl p-6 border border-border text-center">
            <div className="text-4xl mb-3">💗</div>
            <h1 className="text-lg font-semibold text-foreground mb-2">
              Oups, une erreur est survenue
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || "Erreur inattendue"}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
