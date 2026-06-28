import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/features/language-switcher', () => ({
  setUserLocale: vi.fn(),
}));

import { LandingPage } from '../index';

describe('LandingPage', () => {
  it('renders hero and CTA links to /login', () => {
    render(<LandingPage />);
    expect(screen.getByText('hero.title')).toBeInTheDocument();
    const ctas = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/login');
    expect(ctas.length).toBeGreaterThanOrEqual(2); // header + hero + final
  });

  it('renders three feature cards', () => {
    render(<LandingPage />);
    expect(screen.getByText('features.calendar.title')).toBeInTheDocument();
    expect(screen.getByText('features.chat.title')).toBeInTheDocument();
    expect(screen.getByText('features.community.title')).toBeInTheDocument();
  });
});
