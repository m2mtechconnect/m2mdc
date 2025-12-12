/**
 * Simulation Error Boundaries
 * Catches and handles errors in simulation components gracefully
 * Prevents entire app crashes from simulation failures
 */

import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface SimulationErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

/**
 * Error boundary specifically for simulation components
 * Provides graceful degradation and recovery options
 */
export class SimulationErrorBoundary extends Component<
  SimulationErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: SimulationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for debugging
    console.error('[SimulationErrorBoundary] Caught error:', error);
    console.error('[SimulationErrorBoundary] Error info:', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-destructive">
                  Simulation Error
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {this.props.fallbackMessage || 
                    'An error occurred in the simulation component. This has been logged for investigation.'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <pre className="mt-2 p-2 bg-muted rounded text-xs text-left overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary for KPI components
 * Shows placeholder instead of crashing
 */
export class KPIErrorBoundary extends Component<
  { children: ReactNode; kpiName?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; kpiName?: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[KPIErrorBoundary] Error in ${this.props.kpiName || 'KPI'}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {this.props.kpiName ? `${this.props.kpiName} unavailable` : 'KPI unavailable'}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary for timeline/chart components
 */
export class ChartErrorBoundary extends Component<
  { children: ReactNode; chartType?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; chartType?: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ChartErrorBoundary] Error in ${this.props.chartType || 'chart'}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-48 flex items-center justify-center rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {this.props.chartType ? `${this.props.chartType} failed to load` : 'Chart unavailable'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap any component with simulation error boundary
 */
export function withSimulationErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackMessage?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <SimulationErrorBoundary fallbackMessage={fallbackMessage}>
        <WrappedComponent {...props} />
      </SimulationErrorBoundary>
    );
  };
}
