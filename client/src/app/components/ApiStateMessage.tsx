import React from 'react';

interface ApiStateMessageProps {
  variant: 'empty' | 'error';
  title: string;
  description: string;
}

export function ApiStateMessage({ variant, title, description }: ApiStateMessageProps) {
  return (
    <div
      className={`rounded-2xl p-6 text-center border ${
        variant === 'error'
          ? 'bg-red-50 border-red-100 text-red-800'
          : 'bg-gray-50 border-gray-100 text-gray-600'
      }`}
    >
      <p className="font-bold text-gray-900">{title}</p>
      <p className="text-sm mt-2 font-medium">{description}</p>
    </div>
  );
}
