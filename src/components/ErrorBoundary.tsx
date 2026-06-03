import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    console.log("Window width:", typeof window !== "undefined" ? window.innerWidth : "n/a");
    console.log("User agent:", typeof navigator !== "undefined" ? navigator.userAgent : "n/a");
    this.setState({ info });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "Erreur inconnue";
      const stack = this.state.error?.stack ?? "";
      const componentStack = this.state.info?.componentStack ?? "";
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "24px",
            background: "#fff",
            color: "#1a1a1a",
            fontFamily: "system-ui, -apple-system, sans-serif",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
              😕 Une erreur est survenue
            </h1>
            <p
              style={{
                background: "#fee",
                border: "1px solid #f5b5b5",
                color: "#a00",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                wordBreak: "break-word",
                fontSize: 14,
              }}
            >
              <strong>Erreur :</strong> {msg}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: "#1a1a1a",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              Recharger l'application
            </button>
            <details style={{ fontSize: 12, color: "#555" }}>
              <summary style={{ cursor: "pointer", marginBottom: 8 }}>
                Détails techniques
              </summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 6,
                  maxHeight: 300,
                  overflow: "auto",
                }}
              >
                {stack}
                {"\n\n"}
                {componentStack}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
