import React from 'react';
import { render, screen } from '../test-utils';
import { UserDisplay } from '../../components/UserDisplay';

describe('UserDisplay', () => {
  it('shows preferredUsername when available', () => {
    render(<UserDisplay user={{ preferredUsername: 'johndoe', name: 'John Doe', email: 'john@example.com' }} />);
    expect(screen.getByText('johndoe')).toBeInTheDocument();
  });

  it('falls back to name when no preferredUsername', () => {
    render(<UserDisplay user={{ name: 'John Doe', email: 'john@example.com' }} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('falls back to email when no preferredUsername and no name', () => {
    render(<UserDisplay user={{ email: 'john@example.com' }} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows ? when user is undefined and no fallbackId', () => {
    render(<UserDisplay />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('never shows a UUID as display name', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    render(<UserDisplay fallbackId={uuid} />);
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders an avatar when showAvatar is true (default)', () => {
    render(<UserDisplay user={{ email: 'a@b.com' }} />);
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('does not render avatar when showAvatar is false', () => {
    render(<UserDisplay user={{ email: 'a@b.com' }} showAvatar={false} />);
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });
});
