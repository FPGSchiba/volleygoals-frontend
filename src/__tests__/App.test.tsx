import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders header text and link', () => {
  render(<App />);

  // Assert the <header> exists (role "banner")
  expect(screen.getByRole('banner')).toBeInTheDocument();

  // Assert the paragraph contains the joined text (because of the <code> split)
  const paragraph = screen.getByText((_, node) =>
    node?.tagName === 'P' &&
    node.textContent?.includes('Edit src/App.tsx and save to reload.')
  );
  expect(paragraph).toBeInTheDocument();

  // Assert the "Learn React" link target
  const link = screen.getByRole('link', { name: /learn react/i });
  expect(link).toHaveAttribute('href', 'https://reactjs.org');
});
