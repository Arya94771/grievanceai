import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

function ProblemChild() {
  throw new Error('Test crash in child component');
}

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeDefined();
  });

  it('catches render errors and displays friendly fallback UI with reload button', () => {
    // Suppress console.error during test intentional throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText(/Test crash in child component/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Reload Workspace/i })).toBeDefined();

    spy.mockRestore();
  });
});
