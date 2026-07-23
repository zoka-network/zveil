import { Component, type ReactNode } from "react";
import { reportAppError } from "@/lib/error-reporting";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("GlobalErrorBoundary caught:", error);
    reportAppError(error, { boundary: "global_error_boundary" });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Unexpected error
          </p>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The wallet interface hit an unexpected error and could not render. Your keys are
            unaffected — nothing is transmitted from this device.
          </p>
          <pre className="mono mt-4 max-h-32 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-left text-[10px] text-muted-foreground">
            {this.state.error.message}
          </pre>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                this.reset();
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload app
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
