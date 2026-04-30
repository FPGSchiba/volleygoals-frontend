import { buildHeatmapData } from '../../utils/chartUtils';

describe('buildHeatmapData', () => {
  const goals = [{ id: 'g1', title: 'Serve' }, { id: 'g2', title: 'Block' }];
  const reports = [
    {
      id: 'r1',
      createdAt: '2025-03-01T10:00:00Z',
      progress: [
        { id: 'p1', goalId: 'g1', rating: 4 },
        { id: 'p2', goalId: 'g2', rating: 2 },
      ],
    },
    {
      id: 'r2',
      createdAt: '2025-03-08T10:00:00Z',
      progress: [{ id: 'p3', goalId: 'g1', rating: 5 }],
    },
  ];

  it('builds rows for goals that have entries', () => {
    const result = buildHeatmapData(reports, goals);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].goalId).toBe('g1');
  });

  it('builds sorted date columns', () => {
    const result = buildHeatmapData(reports, goals);
    expect(result.dateColumns).toEqual(['2025-03-01', '2025-03-08']);
  });

  it('populates cell ratings correctly', () => {
    const result = buildHeatmapData(reports, goals);
    expect(result.rows[0].cells['2025-03-01'].rating).toBe(4);
    expect(result.rows[0].cells['2025-03-08'].rating).toBe(5);
    expect(result.rows[1].cells['2025-03-01'].rating).toBe(2);
  });

  it('respects maxColumns by keeping the most recent dates', () => {
    const result = buildHeatmapData(reports, goals, 1);
    expect(result.dateColumns).toEqual(['2025-03-08']);
  });

  it('excludes goals not present in any report', () => {
    const result = buildHeatmapData(reports, [{ id: 'g99', title: 'Unknown' }]);
    expect(result.rows).toHaveLength(0);
  });
});
