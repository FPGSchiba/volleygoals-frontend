import { renderHook } from '@testing-library/react';
import { useProgressReportPermissions } from '../useProgressReportPermissions';
import { usePermission } from '../usePermission';

jest.mock('../usePermission');
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('useProgressReportPermissions', () => {
  it('returns canParticipate=true when individual_goals:write permission exists', () => {
    mockUsePermission.mockImplementation((p) => p === 'individual_goals:write');
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(true);
    expect(result.current.canOversee).toBe(false);
  });

  it('returns canOversee=true when members:read permission exists', () => {
    mockUsePermission.mockImplementation((p) => p === 'members:read');
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(false);
    expect(result.current.canOversee).toBe(true);
  });

  it('returns both flags true when user has both permissions', () => {
    mockUsePermission.mockReturnValue(true);
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(true);
    expect(result.current.canOversee).toBe(true);
  });

  it('returns both flags false when user has neither permission', () => {
    mockUsePermission.mockReturnValue(false);
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(false);
    expect(result.current.canOversee).toBe(false);
  });
});
