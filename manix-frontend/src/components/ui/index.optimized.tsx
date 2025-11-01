import React, { useMemo } from 'react';
import { clsx } from 'clsx';

// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = React.memo<CardProps>(({ children, className = "" }) => (
  <div className={clsx("bg-white rounded-xl shadow-sm border border-gray-200 p-6", className)}>
    {children}
  </div>
));

Card.displayName = 'Card';

// Button Component
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = React.memo<ButtonProps>(({ 
  children, 
  onClick, 
  className = "", 
  disabled = false,
  type = 'button'
}) => {
  const buttonClasses = useMemo(() => 
    clsx(
      "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50",
      className
    ),
    [className]
  );

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

// Loading Spinner Component
export const LoadingSpinner = React.memo(() => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export const Badge = React.memo<BadgeProps>(({ children, className = "" }) => {
  const badgeClasses = useMemo(() => 
    clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", className),
    [className]
  );

  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

// Input Component
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const Input = React.memo<InputProps>(({ 
  value, 
  onChange, 
  placeholder, 
  type = "text",
  className = "",
  disabled = false,
  required = false
}) => {
  const inputClasses = useMemo(() => 
    clsx(
      "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50",
      className
    ),
    [className]
  );

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={inputClasses}
    />
  );
});

Input.displayName = 'Input';

// Select Component
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  disabled?: boolean;
}

export const Select = React.memo<SelectProps>(({ 
  value, 
  onChange, 
  options, 
  className = "",
  disabled = false
}) => {
  const selectClasses = useMemo(() => 
    clsx(
      "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50",
      className
    ),
    [className]
  );

  const memoizedOptions = useMemo(() => 
    options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    )),
    [options]
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={selectClasses}
    >
      {memoizedOptions}
    </select>
  );
});

Select.displayName = 'Select';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">Something went wrong</div>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}