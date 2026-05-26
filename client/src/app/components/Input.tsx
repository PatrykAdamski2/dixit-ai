import React from 'react';
import { cn } from './Button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-200",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';