import { NextResponse } from 'next/server';
import { format, subMonths } from 'date-fns';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';
const API_KEY = 'b50efc1b3b48d1a707718355b4f56b21';

export async function GET() {
  try {
    const endDate = new Date();
    const startDate = subMonths(endDate, 12);
    
    const url = `${FRED_API_BASE}/series/observations?series_id=GS3M&api_key=${API_KEY}&file_type=json&observation_start=${format(startDate, 'yyyy-MM-dd')}&observation_end=${format(endDate, 'yyyy-MM-dd')}&frequency=m`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const processedData = data.observations
      .filter((obs: any) => obs.value !== '.')
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value),
        displayDate: format(new Date(obs.date), 'MMM')
      }))
      .slice(-12);
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error fetching 3-month treasury data:', error);
    return NextResponse.json({ error: 'Failed to fetch 3-month treasury data' }, { status: 500 });
  }
}