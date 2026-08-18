/**
 * Bounded terminal recovery state for a route whose lazy chunk genuinely
 * failed to load or whose page threw during render.
 *
 * It never reloads by itself, never polls and never renders unauthorized
 * content: the user is told what happened and given the only two useful
 * actions. In healthy navigations this component never mounts.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

function correlationId(): string {
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  children: ReactNode;
  /** Changing this value clears a previous failure (e.g. on navigation). */
  resetKey?: string;
}
interface State {
  failed: boolean;
  id: string | null;
  resetKey?: string;
}

export class RouteLoadRecovery extends Component<Props, State> {
  state: State = { failed: false, id: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true, id: correlationId() };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { failed: false, id: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only, no remote reporting and no sensitive payloads.
    console.error('[RouteLoadRecovery]', this.state.id, error.message, info.componentStack);
  }

  private retry = () => this.setState({ failed: false, id: null });

  render() {
    if (!this.state.failed) return <>{this.props.children}</>;
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="route-load-recovery"
        className="flex min-h-[50vh] items-center justify-center px-4"
      >
        <div className="max-w-md space-y-3 rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            This workspace could not be loaded
          </h1>
          <p className="text-sm text-muted-foreground">
            The page did not finish loading. Nothing was changed. You can try again, or return to
            the dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button className="min-h-11" onClick={this.retry}>
              Try again
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                window.location.assign('/dashboard');
              }}
            >
              Return to dashboard
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Reference: <span className="font-mono">{this.state.id}</span>
          </p>
        </div>
      </div>
    );
  }
}

export default RouteLoadRecovery;
