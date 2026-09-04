import React from 'react';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error) {
    console.error('View crash:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-passion-200 bg-passion-50 p-6 space-y-3" role="alert">
          <p className="text-sm font-semibold text-passion-800">
            Màn {this.props.label || 'này'} gặp lỗi hiển thị
          </p>
          <p className="text-xs text-passion-700 font-mono break-all">{this.state.message}</p>
          <button
            type="button"
            className="min-h-[44px] px-4 rounded-xl bg-magenta-600 text-white text-xs font-semibold"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Thử render lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
