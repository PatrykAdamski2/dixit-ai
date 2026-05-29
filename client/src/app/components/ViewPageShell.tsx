import React from 'react';
import { ApiPendingBanner } from './ApiPendingBanner';

interface ViewPageShellProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  apiFeature?: string;
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl';
}

const MAX = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' };

/** Wspólny układ nagłówka jak host/join. */
export function ViewPageShell({
  icon,
  title,
  subtitle,
  apiFeature,
  children,
  maxWidth = 'xl',
}: ViewPageShellProps) {
  return (
    <div className={`w-full ${MAX[maxWidth]} mx-auto px-4 py-8 relative`}>
      <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 space-y-8">
        {apiFeature && <ApiPendingBanner feature={apiFeature} />}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2">{icon}</div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{title}</h1>
          <p className="text-gray-500 font-medium text-lg">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
