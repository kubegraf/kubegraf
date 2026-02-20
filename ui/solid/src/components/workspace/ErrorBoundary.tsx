/**
 * ErrorBoundary - Graceful error handling for workspace components
 *
 * Features:
 * - Catches and displays runtime errors
 * - Provides retry mechanism
 * - Logs errors for debugging
 * - Prevents UI crashes
 * - User-friendly error messages
 */

import { Component, JSX, ErrorBoundary as SolidErrorBoundary, createSignal } from 'solid-js';

interface WorkspaceErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (error: Error, reset: () => void) => JSX.Element;
  onError?: (error: Error) => void;
  componentName?: string;
}

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
  componentName?: string;
}

/**
 * Default error fallback UI
 */
const DefaultErrorFallback: Component<ErrorFallbackProps> = (props) => {
  const [showDetails, setShowDetails] = createSignal(false);

  const getErrorMessage = (error: Error): string => {
    // User-friendly error messages based on error type
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'Unable to connect to the server. Please check your network connection.';
    }
    if (error.message.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You do not have permission to perform this action.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const handleCopyError = () => {
    const errorDetails = `
Component: ${props.componentName || 'Unknown'}
Error: ${props.error.name}
Message: ${props.error.message}
Stack: ${props.error.stack || 'No stack trace available'}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      console.log('Error details copied to clipboard');
    });
  };

  return (
    <div class="error-boundary-fallback">
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">Something Went Wrong</h3>
        <p class="error-message">{getErrorMessage(props.error)}</p>

        <div class="error-actions">
          <button class="error-btn primary" onClick={props.reset}>
            <span class="btn-icon">🔄</span>
            <span class="btn-label">Try Again</span>
          </button>
          <button class="error-btn secondary" onClick={() => setShowDetails(!showDetails())}>
            <span class="btn-label">{showDetails() ? 'Hide' : 'Show'} Details</span>
          </button>
        </div>

        {showDetails() && (
          <div class="error-details">
            <div class="error-details-header">
              <h4>Error Details</h4>
              <button class="copy-error-btn" onClick={handleCopyError} title="Copy error details">
                📋
              </button>
            </div>
            <div class="error-info">
              <div class="error-info-item">
                <strong>Component:</strong>
                <code>{props.componentName || 'Unknown'}</code>
              </div>
              <div class="error-info-item">
                <strong>Error Type:</strong>
                <code>{props.error.name}</code>
              </div>
              <div class="error-info-item">
                <strong>Message:</strong>
                <code>{props.error.message}</code>
              </div>
              {props.error.stack && (
                <div class="error-info-item">
                  <strong>Stack Trace:</strong>
                  <pre class="error-stack">{props.error.stack}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {props.componentName && (
          <p class="error-hint">
            If this problem persists, please report it with the error details above.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * WorkspaceErrorBoundary - Error boundary for workspace components
 */
const WorkspaceErrorBoundary: Component<WorkspaceErrorBoundaryProps> = (props) => {
  const handleError = (error: Error) => {
    // Log error for debugging
    console.error(
      `[ErrorBoundary${props.componentName ? ` - ${props.componentName}` : ''}]:`,
      error
    );

    // Call custom error handler if provided
    if (props.onError) {
      props.onError(error);
    }

    // In production, you could send errors to monitoring service
    // Example: sendToErrorTracking(error, props.componentName);
  };

  return (
    <SolidErrorBoundary
      fallback={(error, reset) => {
        handleError(error);
        return props.fallback ? (
          props.fallback(error, reset)
        ) : (
          <DefaultErrorFallback
            error={error}
            reset={reset}
            componentName={props.componentName}
          />
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
};

export default WorkspaceErrorBoundary;

/**
 * Hook for handling async errors in components
 */
export const useAsyncError = () => {
  const [error, setError] = createSignal<Error | null>(null);

  const handleAsyncError = async <T,>(
    promise: Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      setError(null);
      return await promise;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(errorMessage || 'An async operation failed');
      setError(error);
      console.error('[AsyncError]:', error);
      return null;
    }
  };

  const clearError = () => setError(null);

  return {
    error,
    handleAsyncError,
    clearError,
    hasError: () => error() !== null,
  };
};

/**
 * Utility function to create safe async handlers
 */
export const createSafeAsyncHandler = <T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  onError?: (error: Error) => void
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await handler(...args);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Async handler failed');
      console.error('[SafeAsyncHandler]:', error);
      if (onError) {
        onError(error);
      }
      return null;
    }
  };
};

/**
 * Error types for better error categorization
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

export class CategorizedError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CategorizedError';
  }
}

/**
 * Helper to categorize errors
 */
export const categorizeError = (error: Error): ErrorCategory => {
  const message = error.message.toLowerCase();

  if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
    return ErrorCategory.NETWORK;
  }
  if (message.includes('timeout')) {
    return ErrorCategory.TIMEOUT;
  }
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorCategory.PERMISSION;
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return ErrorCategory.VALIDATION;
  }

  return ErrorCategory.UNKNOWN;
};
