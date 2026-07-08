"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("Erro no dashboard:", error);
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1a1a1a] p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-white/70">
            Não foi possível carregar {this.props.label ?? "esta seção"}.
          </p>
          <button
            onClick={this.reset}
            className="text-sm text-[#c9a84c] hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
