import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { Metrics, TimeGranularity } from '@shared/types';
import { GRANULARITY_OPTIONS } from '@shared/types';
import { formatTimeValue } from '@/utils/metricsCalculations';
import { formatTimestamp, type TimeDisplayMode } from '@/utils/timeFormatting';

interface DashboardViewProps {
  metrics: Metrics;
  granularity: TimeGranularity;
  onGranularityChange: (g: TimeGranularity) => void;
  timeDisplayMode: TimeDisplayMode;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      title?: string;
      id?: string;
      cycleTimeHours?: number;
      cycleTimeDays?: number;
      ageHours?: number;
      ageDays?: number;
      closedDate?: number;
      closedDateStr?: string;
      status?: string;
    };
  }>;
  label?: string;
  displayUnit: 'hours' | 'days';
  timeDisplayMode: TimeDisplayMode;
}

function CustomTooltip({ active, payload, displayUnit, timeDisplayMode }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-600 shadow-md rounded text-xs text-slate-700 dark:text-slate-200">
        <p className="font-bold">{data.title}</p>
        <p className="text-slate-500 dark:text-slate-400">{data.id}</p>
        {data.cycleTimeHours !== undefined && (
          <p>Cycle Time: {formatTimeValue(data.cycleTimeHours, displayUnit)}</p>
        )}
        {data.ageHours !== undefined && (
          <p>Age: {formatTimeValue(data.ageHours, displayUnit)}</p>
        )}
        {data.closedDate && <p>Closed: {formatTimestamp(new Date(data.closedDate), timeDisplayMode)}</p>}
        {data.status && <p>Status: {data.status}</p>}
      </div>
    );
  }
  return null;
}

function DashboardView({ metrics, granularity, onGranularityChange, timeDisplayMode }: DashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* Granularity Picker */}
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Time Scale:</span>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onGranularityChange(option.value)}
              className={`px-3 py-1.5 text-xs font-medium border first:rounded-l-md last:rounded-r-md ${
                granularity === option.value
                  ? 'bg-blue-600 text-white border-blue-600 z-10'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card border-l-4 border-l-orange-500">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {metrics.avgAge}{' '}
            <span className="text-sm font-normal text-slate-400 dark:text-slate-500">{metrics.displayUnit}</span>
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
            Avg Work Age
          </div>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {metrics.openCount}
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
            Active WIP
          </div>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {metrics.ageChartData[3].count}
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
            Stale ({metrics.ageChartData[3].range})
          </div>
        </div>
        <div className="card border-l-4 border-l-emerald-500">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100">
            {metrics.flowChartData.length}
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
            {metrics.displayUnit === 'hours' ? 'Periods' : 'Days'} Tracked
          </div>
        </div>
      </div>

      {/* Lead Time Scatterplot */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-bold mb-6 text-slate-700 dark:text-slate-200">
          Lead Time Scatterplot (Cycle Time)
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <ScatterChart margin={{ bottom: metrics.displayUnit === 'hours' ? 60 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="closedDate"
              domain={['auto', 'auto']}
              name="Date Closed"
              tickFormatter={(unixTime) => {
                const date = new Date(unixTime);
                return formatTimestamp(date, timeDisplayMode);
              }}
              type="number"
              fontSize={10}
              angle={timeDisplayMode === 'hour' ? -45 : 0}
              textAnchor={timeDisplayMode === 'hour' ? 'end' : 'middle'}
            />
            <YAxis
              dataKey={metrics.displayUnit === 'hours' ? 'cycleTimeHours' : 'cycleTimeDays'}
              name="Cycle Time"
              unit={metrics.displayUnit === 'hours' ? 'h' : 'd'}
              fontSize={10}
            />
            <Tooltip content={<CustomTooltip displayUnit={metrics.displayUnit} timeDisplayMode={timeDisplayMode} />} />
            <ReferenceLine
              y={metrics.displayUnit === 'hours' ? metrics.cycleTimeP50 : metrics.cycleTimeP50 / 24}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                position: 'insideTopRight',
                value: `50th: ${formatTimeValue(metrics.cycleTimeP50, metrics.displayUnit)}`,
                fill: '#10b981',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={metrics.displayUnit === 'hours' ? metrics.cycleTimeP85 : metrics.cycleTimeP85 / 24}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{
                position: 'insideTopRight',
                value: `85th: ${formatTimeValue(metrics.cycleTimeP85, metrics.displayUnit)}`,
                fill: '#f59e0b',
                fontSize: 10,
              }}
            />
            <Scatter name="Issues" data={metrics.leadTimeData} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Aging WIP */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-bold mb-6 text-slate-700 dark:text-slate-200">
          Aging Work in Progress
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="status"
              type="category"
              name="Status"
              allowDuplicatedCategory={false}
              fontSize={12}
            />
            <YAxis
              dataKey={metrics.displayUnit === 'hours' ? 'ageHours' : 'ageDays'}
              name="Age"
              unit={metrics.displayUnit === 'hours' ? 'h' : 'd'}
              fontSize={10}
            />
            <Tooltip content={<CustomTooltip displayUnit={metrics.displayUnit} timeDisplayMode={timeDisplayMode} />} />
            <Scatter name="WIP" data={metrics.agingWipData}>
              {metrics.agingWipData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* CFD */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-bold mb-6 text-slate-700 dark:text-slate-200">
          Cumulative Flow Diagram
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart
            data={metrics.flowChartData}
            margin={{ bottom: timeDisplayMode === 'hour' ? 60 : 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="date"
              fontSize={10}
              minTickGap={50}
              angle={timeDisplayMode === 'hour' ? -45 : 0}
              textAnchor={timeDisplayMode === 'hour' ? 'end' : 'middle'}
            />
            <YAxis fontSize={10} />
            <Tooltip labelClassName="text-slate-800 font-bold" />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Area
              type="linear"
              dataKey="closed"
              stackId="1"
              stroke="#10b981"
              fill="#dcfce7"
              name="Completed"
            />
            <Area
              type="linear"
              dataKey="open"
              stackId="1"
              stroke="#3b82f6"
              fill="#dbeafe"
              name="WIP (Open)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Age & Throughput Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card h-80">
          <h3 className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-200">Work Age Distribution</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={metrics.ageChartData}>
              <XAxis dataKey="range" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {metrics.ageChartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][i]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card h-80">
          <h3 className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-200">
            {metrics.granularity === 'daily' ? 'Daily' : 'Period'} Throughput
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={metrics.flowChartData}>
              <XAxis dataKey="date" fontSize={10} minTickGap={50} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar
                dataKey="throughput"
                fill="#64748b"
                radius={[2, 2, 0, 0]}
                name="Closed"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
