import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Sindria UI:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-surface text-ink flex flex-col items-center justify-center p-4">
          <Card variant="default" className="max-w-md w-full p-6 text-center space-y-4 border-borderline">
            <div className="w-12 h-12 rounded-full bg-borderline-bg text-borderline flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-display text-ink">
                S'ha produït un error inesperat
              </h2>
              <p className="text-xs text-ink-muted">
                L'aplicació ha trobat una fallada puntual. Pots reiniciar l'anàlisi per continuar.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-surface-subtle rounded-xl text-left font-mono text-[11px] text-ink-muted break-words overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <Button onClick={this.handleReset} variant="primary" className="w-full gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Reiniciar Síndria Madurada</span>
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
