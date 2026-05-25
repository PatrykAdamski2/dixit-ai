import React from 'react';
import { usePreviewSeed, type PreviewScenario } from '../hooks/usePreviewSeed';

export function PreviewRoute({
  scenario,
  children,
}: {
  scenario: PreviewScenario;
  children: React.ReactNode;
}) {
  usePreviewSeed(scenario);
  return <>{children}</>;
}
