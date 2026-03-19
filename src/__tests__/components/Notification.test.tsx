import React from 'react';
import { render, screen } from '../test-utils';
import { Notification } from '../../components/Notification';
import { useNotificationStore } from '../../store/notification';

beforeEach(() => {
  useNotificationStore.setState({ notifications: [] });
});

describe('Notification', () => {
  it('does not render when no notifications', () => {
    const { container } = render(<Notification />);
    // Snackbar should not be visible
    expect(container.querySelector('.MuiSnackbar-root')).toBeFalsy();
  });

  it('renders notifications from store', () => {
    useNotificationStore.setState({
      notifications: [
        { id: '1', level: 'success', title: 'Success', message: 'All good' },
        { id: '2', level: 'error', title: 'Error', message: 'Something failed' },
      ],
    });

    render(<Notification />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
