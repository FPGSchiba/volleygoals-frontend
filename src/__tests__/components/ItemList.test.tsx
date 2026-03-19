import React from 'react';
import { render, screen, waitFor, fireEvent } from '../test-utils';
import { ItemList } from '../../components/ItemList';
import { IFilterOption } from '../../services/types';

const mockFetch = jest.fn().mockResolvedValue({ items: [], count: 0 });
const mockCreate = jest.fn();

function renderItemList(props: Partial<React.ComponentProps<typeof ItemList>> = {}) {
  const defaultProps = {
    title: 'Test List',
    columns: ['Name', 'Status'],
    fetch: mockFetch,
    renderRow: (item: any) => [item.name, item.status],
    items: [] as any[],
    count: 0,
    ...props,
  };
  return render(<ItemList {...defaultProps} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ItemList', () => {
  it('renders column headers', () => {
    renderItemList();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders title', () => {
    renderItemList();
    expect(screen.getByText('Test List')).toBeInTheDocument();
  });

  it('calls fetch on mount', async () => {
    renderItemList();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it('shows "No items found" when empty', async () => {
    renderItemList();
    expect(await screen.findByText('No items found.')).toBeInTheDocument();
  });

  it('renders create button when create is provided', () => {
    renderItemList({ create: mockCreate });
    const btn = screen.getByText('Create');
    expect(btn).toBeInTheDocument();
  });

  it('disables create button when createDisabled is true', () => {
    renderItemList({ create: mockCreate, createDisabled: true });
    const btn = screen.getByText('Create');
    expect(btn).toBeDisabled();
  });

  it('does not render create button when create is not provided', () => {
    renderItemList();
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
  });

  it('renders items when provided', async () => {
    const items = [
      { id: '1', name: 'Item 1', status: 'active' },
      { id: '2', name: 'Item 2', status: 'inactive' },
    ];
    renderItemList({ items, count: 2 });
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('does not fetch when initialFetchPaused is true', async () => {
    renderItemList({ initialFetchPaused: true });
    // Should show loading state, not call fetch
    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
