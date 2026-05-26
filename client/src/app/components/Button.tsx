import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer shadow-sm hover:shadow-md",
          {
            'bg-orange-500 text-white hover:bg-orange-600 border border-orange-600': variant === 'primary',
            'bg-gray-800 text-white hover:bg-gray-900 border border-gray-900': variant === 'secondary',
            'bg-transparent text-gray-800 border-2 border-gray-800 hover:bg-gray-100': variant === 'outline',
            'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 shadow-none hover:shadow-none': variant === 'ghost',
            'h-9 px-4 text-sm': size === 'sm',
            'h-12 px-6 text-base': size === 'md',
            'h-16 px-10 text-xl rounded-2xl': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';