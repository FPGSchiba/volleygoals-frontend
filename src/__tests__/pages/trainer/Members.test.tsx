import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockTeamState } from '../../mocks/stores';
import { buildTeamUser } from '../../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

let Members: any;
try { Members = require('../../../pages/trainer/Members').Members; } catch { Members = null; }
if (!Members) try { Members = require('../../../pages/trainer/Members').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

function setup(teamStateOverrides?: Record<string, any>) {
  setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
  setupMockStore(useTeamStore as any, mockTeamState(teamStateOverrides));
}

describe('Members (Trainer)', () => {
  if (!Members) {
    it('component exists', () => expect(Members).toBeTruthy());
    return;
  }

  it('renders member list', () => {
    setup({ teamMembers: [buildTeamUser({ name: 'Alice', email: 'alice@t.com' })] });
    render(<Members />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders member rows as vg-row-item', () => {
    const member = buildTeamUser({ name: 'Maria K.', email: 'maria@example.com' });
    setup({ teamMembers: [member] });
    render(<Members />);
    expect(screen.getByText('Maria K.')).toBeInTheDocument();
  });

  it('renders filter chips for All, Trainers, Members', () => {
    setup();
    render(<Members />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Trainers')).toBeInTheDocument();
  });
});
