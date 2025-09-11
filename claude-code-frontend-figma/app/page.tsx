'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';
import { fetchCPIData, fetchUnemploymentData, fetch10YearTreasuryData, fetch3MonthTreasuryData, ChartDataPoint } from '@/lib/fred-api';

interface ChartCardProps {
  title: string;
  data: ChartDataPoint[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  loading?: boolean;
  error?: string;
}

function ChartCard({ title, data, dataKey, xAxisKey, color = "#8884d8", loading, error }: ChartCardProps) {
  return (
    <div className="bg-gray-200 rounded-lg p-4 w-full max-w-[512px] h-[300px]">
      <h3 className="font-bold text-xl mb-3 text-black leading-tight">{title}</h3>
      <div className="h-[240px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-600">Error loading data</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Sidebar() {
  const menuItems = [
    { name: 'Key Indicators', icon: '📈', active: true },
    { name: 'Inflation', icon: '📊', active: false },
    { name: 'Employment', icon: '👥', active: false },
    { name: 'Interest Rates', icon: '📈', active: false },
    { name: 'Economic Growth', icon: '📈', active: false },
    { name: 'Exchange Rates', icon: '🏠', active: false },
    { name: 'Housing', icon: '🏠', active: false },
    { name: 'Consumer Spending', icon: '🛒', active: false },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">FRED Indicators</h1>
        <p className="text-sm text-gray-600 mt-1">Economic Data Dashboard</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              <a
                href="#"
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
                <span className="ml-auto">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Data provided by Federal Reserve Economic Data (FRED)
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: cpiData, error: cpiError, isLoading: cpiLoading } = useSWR('cpi-data', fetchCPIData);
  const { data: unemploymentData, error: unemploymentError, isLoading: unemploymentLoading } = useSWR('unemployment-data', fetchUnemploymentData);
  const { data: treasury10YearData, error: treasury10YearError, isLoading: treasury10YearLoading } = useSWR('treasury-10year-data', fetch10YearTreasuryData);
  const { data: treasury3MonthData, error: treasury3MonthError, isLoading: treasury3MonthLoading } = useSWR('treasury-3month-data', fetch3MonthTreasuryData);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Economic Indicators Dashboard</h1>
            <p className="text-gray-600">Real-time economic data from the Federal Reserve Economic Data (FRED) system</p>
          </div>
          
          <div className="bg-gray-300/60 rounded-xl p-6 backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard
                title="CPI - last five years"
                data={cpiData || []}
                dataKey="value"
                xAxisKey="displayDate"
                color="#3b82f6"
                loading={cpiLoading}
                error={cpiError?.message}
              />
              <ChartCard
                title="Infra-Annual Labor Statistics: Unemployment Rate Total"
                data={unemploymentData || []}
                dataKey="value"
                xAxisKey="displayDate"
                color="#ef4444"
                loading={unemploymentLoading}
                error={unemploymentError?.message}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Interest Rates: Long-Term Government Bond Yields: 10-Year"
                data={treasury10YearData || []}
                dataKey="value"
                xAxisKey="displayDate"
                color="#10b981"
                loading={treasury10YearLoading}
                error={treasury10YearError?.message}
              />
              <ChartCard
                title="Interest Rates: 3-Month or 90-Day Rates and Yields"
                data={treasury3MonthData || []}
                dataKey="value"
                xAxisKey="displayDate"
                color="#f59e0b"
                loading={treasury3MonthLoading}
                error={treasury3MonthError?.message}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
