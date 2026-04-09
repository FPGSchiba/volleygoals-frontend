import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamOverviewView } from '../TeamOverviewView';

jest.mock('../../../store/progressReports', () => ({
  useProgressReportStore: () => ({
    reportList: {
      reports: [
        { id: 'r1', authorId: 'user-1', createdAt: '2025-03-01T00:00:00Z', summary: 'S1', progress: [] },
        { id: 'r2', authorId: 'user-2', createdAt: '2025-03-05T00:00:00Z', summary: 'S2', progress: [] },
      ],
    },
    fetchReports: jest.fn(),
  }),
}));

const mockMembers = [
  { id: 'user-1', name: 'Anna Müller', picture: undefined },
  { id: 'user-2', name: 'Bob Klein', picture: undefined },
];

describe('TeamOverviewView', () => {
  it('renders a card for each team member', () => {
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Anna Müller')).toBeInTheDocument();
    expect(screen.getByText('Bob Klein')).toBeInTheDocument();
  });

  it('shows the report count per member', () => {
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={jest.fn()}
      />,
    );
    // Anna has 1 report, Bob has 1 report
    expect(screen.getAllByText(/1 report/i)).toHaveLength(2);
  });

  it('calls onMemberSelect with memberId when a member card is clicked', async () => {
    const onMemberSelect = jest.fn();
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={onMemberSelect}
      />,
    );
    await userEvent.click(screen.getByText('Anna Müller'));
    expect(onMemberSelect).toHaveBeenCalledWith('user-1');
  });

  it('filters members when search input is used', async () => {
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={jest.fn()}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText(/search members/i), 'Anna');
    expect(screen.getByText('Anna Müller')).toBeInTheDocument();
    expect(screen.queryByText('Bob Klein')).not.toBeInTheDocument();
  });
});
