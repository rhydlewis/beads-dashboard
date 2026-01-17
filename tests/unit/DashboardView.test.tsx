import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardView from '@/components/DashboardView';
import type { Metrics, TimeGranularity } from '@shared/types';

// Mock Recharts to avoid rendering complexity
vi.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Scatter: ({ name, data }: any) => <div data-testid={`scatter-${name}`}>Data: {data?.length || 0} points</div>,
    Area: ({ name, dataKey }: any) => <div data-testid={`area-${dataKey}`}>{name}</div>,
    Bar: ({ dataKey, children }: any) => <div data-testid={`bar-${dataKey}`}>{children}</div>,
    XAxis: ({ dataKey }: any) => <div data-testid="x-axis">{dataKey}</div>,
    YAxis: ({ dataKey }: any) => <div data-testid="y-axis">{dataKey}</div>,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: ({ content }: any) => <div data-testid="tooltip">{content}</div>,
    Legend: () => <div data-testid="legend" />,
    Cell: ({ fill }: any) => <div data-testid="cell" style={{ fill }} />,
    ReferenceLine: ({ y, label }: any) => (
      <div data-testid="reference-line" data-y={y}>
        {label?.value}
      </div>
    ),
  };
});

// Sample metrics data
const mockMetrics: Metrics = {
  leadTimeData: [
    {
      id: 'issue-1',
      title: 'Issue 1',
      cycleTimeHours: 48,
      cycleTimeDays: 2,
      closedDate: 1705392000000,
      closedDateStr: '2024-01-16',
    },
    {
      id: 'issue-2',
      title: 'Issue 2',
      cycleTimeHours: 72,
      cycleTimeDays: 3,
      closedDate: 1705478400000,
      closedDateStr: '2024-01-17',
    },
  ],
  agingWipData: [
    {
      id: 'wip-1',
      title: 'WIP Issue 1',
      status: 'in_progress',
      ageHours: 96,
      ageDays: 4,
      color: '#10b981',
    },
    {
      id: 'wip-2',
      title: 'WIP Issue 2',
      status: 'open',
      ageHours: 120,
      ageDays: 5,
      color: '#f59e0b',
    },
  ],
  flowChartData: [
    { date: '2024-01-15', open: 5, closed: 3, throughput: 1 },
    { date: '2024-01-16', open: 6, closed: 4, throughput: 1 },
    { date: '2024-01-17', open: 7, closed: 5, throughput: 1 },
  ],
  ageChartData: [
    { range: '0-7d', count: 5 },
    { range: '8-14d', count: 3 },
    { range: '15-30d', count: 2 },
    { range: '>30d', count: 1 },
  ],
  avgAge: 8.5,
  openCount: 7,
  displayUnit: 'days',
  cycleTimeP50: 60,
  cycleTimeP85: 120,
  granularity: 'daily',
};

const mockMetricsHourly: Metrics = {
  ...mockMetrics,
  displayUnit: 'hours',
  avgAge: 204,
  granularity: 'hourly',
};

describe('DashboardView Component', () => {
  let mockOnGranularityChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnGranularityChange = vi.fn();
  });

  describe('Summary Cards', () => {
    it('should render all four summary cards', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Avg Work Age')).toBeInTheDocument();
      expect(screen.getByText('Active WIP')).toBeInTheDocument();
      expect(screen.getByText(/Stale/)).toBeInTheDocument();
      expect(screen.getByText(/Days Tracked/)).toBeInTheDocument();
    });

    it('should display correct average age value', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('8.5')).toBeInTheDocument();
      expect(screen.getByText('days')).toBeInTheDocument();
    });

    it('should display correct WIP count', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const wipCard = screen.getByText('Active WIP').closest('.card');
      expect(within(wipCard!).getByText('7')).toBeInTheDocument();
    });

    it('should display stale count from age chart data', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const staleCard = screen.getByText(/Stale/).closest('.card');
      expect(within(staleCard!).getByText('1')).toBeInTheDocument();
      expect(within(staleCard!).getByText(/\>30d/)).toBeInTheDocument();
    });

    it('should display days tracked from flow chart data length', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const trackedCard = screen.getByText(/Days Tracked/).closest('.card');
      expect(within(trackedCard!).getByText('3')).toBeInTheDocument();
    });

    it('should show hours unit when displayUnit is hours', () => {
      render(
        <DashboardView
          metrics={mockMetricsHourly}
          granularity="hourly"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('204')).toBeInTheDocument();
      expect(screen.getByText('hours')).toBeInTheDocument();
      expect(screen.getByText('Periods Tracked')).toBeInTheDocument();
    });

    it('should apply correct border colors to summary cards', () => {
      const { container } = render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const cards = container.querySelectorAll('.card');
      expect(cards[0].className).toContain('border-l-orange-500');
      expect(cards[1].className).toContain('border-l-blue-500');
      expect(cards[2].className).toContain('border-l-red-500');
      expect(cards[3].className).toContain('border-l-emerald-500');
    });
  });

  describe('Granularity Picker', () => {
    it('should render all granularity options', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Hourly')).toBeInTheDocument();
      expect(screen.getByText('4-Hour')).toBeInTheDocument();
      expect(screen.getByText('8-Hour')).toBeInTheDocument();
      expect(screen.getByText('Daily')).toBeInTheDocument();
    });

    it('should highlight active granularity', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const dailyButton = screen.getByText('Daily');
      expect(dailyButton.className).toContain('bg-blue-600');
      expect(dailyButton.className).toContain('text-white');

      const hourlyButton = screen.getByText('Hourly');
      expect(hourlyButton.className).toContain('bg-white');
      expect(hourlyButton.className).toContain('text-slate-600');
    });

    it('should call onGranularityChange when granularity button clicked', async () => {
      const user = userEvent.setup();
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const fourHourButton = screen.getByText('4-Hour');
      await user.click(fourHourButton);

      expect(mockOnGranularityChange).toHaveBeenCalledWith('4-hourly');
    });

    it('should call onGranularityChange with correct value for each option', async () => {
      const user = userEvent.setup();
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      await user.click(screen.getByText('Hourly'));
      expect(mockOnGranularityChange).toHaveBeenCalledWith('hourly');

      await user.click(screen.getByText('4-Hour'));
      expect(mockOnGranularityChange).toHaveBeenCalledWith('4-hourly');

      await user.click(screen.getByText('8-Hour'));
      expect(mockOnGranularityChange).toHaveBeenCalledWith('8-hourly');

      await user.click(screen.getByText('Daily'));
      expect(mockOnGranularityChange).toHaveBeenCalledWith('daily');
    });
  });

  describe('Chart Rendering', () => {
    it('should render lead time scatterplot', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Lead Time Scatterplot (Cycle Time)')).toBeInTheDocument();
      const scatterCharts = screen.getAllByTestId('scatter-chart');
      expect(scatterCharts.length).toBeGreaterThan(0);
    });

    it('should render aging WIP scatterplot', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Aging Work in Progress')).toBeInTheDocument();
      const scatterCharts = screen.getAllByTestId('scatter-chart');
      expect(scatterCharts.length).toBe(2);
    });

    it('should render cumulative flow diagram', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Cumulative Flow Diagram')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-closed')).toBeInTheDocument();
      expect(screen.getByTestId('area-open')).toBeInTheDocument();
    });

    it('should render age distribution bar chart', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Work Age Distribution')).toBeInTheDocument();
      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBeGreaterThan(0);
    });

    it('should render throughput bar chart', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Daily Throughput')).toBeInTheDocument();
      const barCharts = screen.getAllByTestId('bar-chart');
      expect(barCharts.length).toBe(2);
    });

    it('should show "Period Throughput" for non-daily granularity', () => {
      render(
        <DashboardView
          metrics={mockMetricsHourly}
          granularity="hourly"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Period Throughput')).toBeInTheDocument();
      expect(screen.queryByText('Daily Throughput')).not.toBeInTheDocument();
    });

    it('should render all charts with ResponsiveContainer', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const containers = screen.getAllByTestId('responsive-container');
      expect(containers.length).toBe(5); // 4 main charts + 1 additional chart
    });
  });

  describe('Lead Time Chart Reference Lines', () => {
    it('should render P50 reference line with correct label', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const referenceLines = screen.getAllByTestId('reference-line');
      const p50Line = referenceLines.find(line => line.textContent?.includes('50th'));
      expect(p50Line).toBeTruthy();
      expect(p50Line?.textContent).toContain('50th');
    });

    it('should render P85 reference line with correct label', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const referenceLines = screen.getAllByTestId('reference-line');
      const p85Line = referenceLines.find(line => line.textContent?.includes('85th'));
      expect(p85Line).toBeTruthy();
      expect(p85Line?.textContent).toContain('85th');
    });

    it('should use correct y-value for P50 in days', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const referenceLines = screen.getAllByTestId('reference-line');
      const p50Line = referenceLines.find(line => line.textContent?.includes('50th'));
      // P50 = 60 hours / 24 = 2.5 days
      expect(p50Line?.getAttribute('data-y')).toBe('2.5');
    });

    it('should use correct y-value for P85 in days', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const referenceLines = screen.getAllByTestId('reference-line');
      const p85Line = referenceLines.find(line => line.textContent?.includes('85th'));
      // P85 = 120 hours / 24 = 5 days
      expect(p85Line?.getAttribute('data-y')).toBe('5');
    });

    it('should use hours for reference lines when displayUnit is hours', () => {
      render(
        <DashboardView
          metrics={mockMetricsHourly}
          granularity="hourly"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const referenceLines = screen.getAllByTestId('reference-line');
      const p50Line = referenceLines.find(line => line.textContent?.includes('50th'));
      expect(p50Line?.getAttribute('data-y')).toBe('60'); // Direct hours value
    });
  });

  describe('Chart Data Rendering', () => {
    it('should render correct number of lead time data points', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const scatterIssues = screen.getByTestId('scatter-Issues');
      expect(scatterIssues.textContent).toContain('2 points');
    });

    it('should render correct number of aging WIP data points', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const scatterWIP = screen.getByTestId('scatter-WIP');
      expect(scatterWIP.textContent).toContain('2 points');
    });

    it('should render CFD areas with correct names', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('WIP (Open)')).toBeInTheDocument();
    });

    it('should render age distribution bars', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const barCount = screen.getByTestId('bar-count');
      expect(barCount).toBeInTheDocument();
    });

    it('should render throughput bars', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const barThroughput = screen.getByTestId('bar-throughput');
      expect(barThroughput).toBeInTheDocument();
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty lead time data gracefully', () => {
      const emptyMetrics: Metrics = {
        ...mockMetrics,
        leadTimeData: [],
      };

      render(
        <DashboardView
          metrics={emptyMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const scatterIssues = screen.getByTestId('scatter-Issues');
      expect(scatterIssues.textContent).toContain('0 points');
    });

    it('should handle empty aging WIP data gracefully', () => {
      const emptyMetrics: Metrics = {
        ...mockMetrics,
        agingWipData: [],
      };

      render(
        <DashboardView
          metrics={emptyMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const scatterWIP = screen.getByTestId('scatter-WIP');
      expect(scatterWIP.textContent).toContain('0 points');
    });

    it('should handle zero values in summary cards', () => {
      const zeroMetrics: Metrics = {
        ...mockMetrics,
        avgAge: 0,
        openCount: 0,
      };

      render(
        <DashboardView
          metrics={zeroMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const avgAgeCard = screen.getByText('Avg Work Age').closest('.card');
      expect(within(avgAgeCard!).getByText('0')).toBeInTheDocument();

      const wipCard = screen.getByText('Active WIP').closest('.card');
      expect(within(wipCard!).getByText('0')).toBeInTheDocument();
    });
  });

  describe('Display Unit Variations', () => {
    it('should adjust chart margins for hourly display', () => {
      const { container } = render(
        <DashboardView
          metrics={mockMetricsHourly}
          granularity="hourly"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      // Chart components should be rendered (mocked components don't show margin prop but verify rendering)
      expect(container.querySelector('[data-testid="scatter-chart"]')).toBeInTheDocument();
    });

    it('should show correct time scale label', () => {
      render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      expect(screen.getByText('Time Scale:')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render all sections in correct order', () => {
      const { container } = render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const sections = container.querySelectorAll('.card');
      // 4 summary cards + 3 chart cards + 2 chart cards in grid = 9 total
      expect(sections.length).toBe(9);
    });

    it('should have responsive grid layout for summary cards', () => {
      const { container } = render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-4');
      expect(grid).toBeInTheDocument();
    });

    it('should have responsive grid layout for age/throughput charts', () => {
      const { container } = render(
        <DashboardView
          metrics={mockMetrics}
          granularity="daily"
          onGranularityChange={mockOnGranularityChange}
        />
      );

      const grids = container.querySelectorAll('.grid-cols-1.md\\:grid-cols-2');
      expect(grids.length).toBeGreaterThan(0);
    });
  });
});
