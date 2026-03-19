import { useNotificationStore } from '../../store/notification';

// Reset store between tests
beforeEach(() => {
  useNotificationStore.setState({ notifications: [] });
});

describe('notification store', () => {
  it('notify adds a notification with generated ID', () => {
    const { notify } = useNotificationStore.getState();
    notify({ level: 'success', title: 'Test', message: 'Hello' });

    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Test');
    expect(notifications[0].message).toBe('Hello');
    expect(notifications[0].level).toBe('success');
    expect(notifications[0].id).toBeTruthy();
  });

  it('closeNotification removes by ID', () => {
    const { notify } = useNotificationStore.getState();
    notify({ level: 'info', title: 'A', message: 'a' });

    // Wait to avoid dedup
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(1);

    const id = notifications[0].id;
    useNotificationStore.getState().closeNotification(id);

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('suppresses duplicate notifications within TTL', () => {
    const { notify } = useNotificationStore.getState();
    const event = { level: 'error' as const, title: 'Dup', message: 'Same' };

    notify(event);
    notify(event); // duplicate — should be suppressed

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('allows same notification after TTL expires', async () => {
    const { notify } = useNotificationStore.getState();
    const event = { level: 'warning' as const, title: 'Retry', message: 'Again' };

    notify(event);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);

    // Wait for TTL (2000ms) + buffer
    await new Promise(r => setTimeout(r, 2200));

    notify(event);
    expect(useNotificationStore.getState().notifications).toHaveLength(2);
  }, 10000);
});
