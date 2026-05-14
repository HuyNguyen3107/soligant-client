import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  /** Name shown in the fallback message, e.g. "Đơn hàng". */
  label?: string;
  /** Custom fallback. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Reset boundary when this value changes (e.g. activeTab id). */
  resetKey?: unknown;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.label ?? "section", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ error: null });
    }
  }

  private reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "#b91c1c",
          }}
        >
          <h2 style={{ marginBottom: 8, fontSize: 18 }}>
            Đã xảy ra lỗi khi tải {this.props.label ?? "nội dung này"}.
          </h2>
          <p style={{ marginBottom: 16, color: "#555", fontSize: 14 }}>
            Vui lòng thử lại. Nếu lỗi tiếp tục, hãy liên hệ quản trị viên.
          </p>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #b91c1c",
              background: "#fff",
              color: "#b91c1c",
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
