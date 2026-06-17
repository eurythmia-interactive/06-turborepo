import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/layout/page-header';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Test Title" />);

    expect(screen.getByRole('heading', { name: /test title/i })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHeader title="Test Title" description="Test description" />);

    expect(screen.getByText(/test description/i)).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<PageHeader title="Test Title" />);

    expect(screen.queryByText(/test description/i)).not.toBeInTheDocument();
  });

  it('renders children as actions', () => {
    render(
      <PageHeader title="Test Title">
        <button>Action Button</button>
      </PageHeader>,
    );

    expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
  });
});
