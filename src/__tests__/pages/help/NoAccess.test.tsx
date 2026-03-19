import React from 'react';
import { render, screen } from '../../test-utils';
import { NoAccess } from '../../../pages/help/NoAccess';

describe('NoAccess', () => {
  it('renders 403 message', () => {
    render(<NoAccess />);
    expect(screen.getByText('403 - No Access')).toBeInTheDocument();
  });
});
