import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileLink } from './ProfileLink';

describe('ProfileLink', () => {
  it('renders a link to the public profile when publicId is present', () => {
    render(<ProfileLink publicId="a1B2c3D4">Alice</ProfileLink>);

    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', '/profile/a1B2c3D4');
    expect(link).toHaveAttribute('data-user-public-id', 'a1B2c3D4');
    expect(link).not.toHaveAttribute('target');
  });

  it('renders plain text without a link when publicId is missing', () => {
    render(<ProfileLink publicId={null}>Alice</ProfileLink>);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('preserves the passed className in the no-link fallback', () => {
    render(<ProfileLink publicId={undefined} className="custom">Alice</ProfileLink>);

    expect(screen.getByText('Alice')).toHaveClass('custom');
  });
});
