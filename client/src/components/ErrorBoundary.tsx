import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Last-resort fallback so a render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Deadwood] Uncaught render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#efe6d5] p-6 text-center text-stone-900 dark:bg-[#0d0806] dark:text-stone-100"
      >
        <h1 className="font-display text-2xl">The saloon table tipped over</h1>
        <p className="max-w-md font-serif text-sm text-stone-700 dark:text-stone-300">
          Something went wrong and the match could not continue. Reload to deal a fresh hand.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-amber-300/70 border-b-4 border-b-amber-900 bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-2.5 text-sm font-semibold text-stone-950 active:translate-y-0.5 active:border-b-2"
        >
          Reload
        </button>
      </div>
    );
  }
}
