import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextSwitcher } from '../ContextSwitcher';

const mockMembers = [
  { id: 'user-1', name: 'Anna Müller' },
  { id: 'user-2', name: 'Bob Klein' },
];

describe('ContextSwitcher', () => {
  it('shows all three segments when canParticipate and canOversee are both true', () => {
    render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={true}
        value="personal"
        onChange={jest.fn()}
        members={mockMembers}
      />,
    );
    expect(screen.getByRole('button', { name: /my progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /team overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /member/i })).toBeInTheDocument();
  });

  it('does not render at all when only canParticipate is true', () => {
    const { container } = render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={false}
        value="personal"
        onChange={jest.fn()}
        members={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render at all when only canOversee is true', () => {
    const { container } = render(
      <ContextSwitcher
        canParticipate={false}
        canOversee={true}
        value="team"
        onChange={jest.fn()}
        members={mockMembers}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onChange with "personal" when My Progress is clicked', async () => {
    const onChange = jest.fn();
    render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={true}
        value="team"
        onChange={onChange}
        members={mockMembers}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /my progress/i }));
    expect(onChange).toHaveBeenCalledWith('personal');
  });

  it('shows member autocomplete when Member button is active', async () => {
    render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={true}
        value="member"
        onChange={jest.fn()}
        members={mockMembers}
      />,
    );
    expect(screen.getByPlaceholderText(/search member/i)).toBeInTheDocument();
  });
});
