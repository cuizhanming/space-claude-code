import { NextResponse } from 'next/server';
import { format, subYears } from 'date-fns';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';
const API_KEY = 'b50efc1b3b48d1a707718355b4f56b21';

export async function GET() {
  try {
    const endDate = new Date();
    const startDate = subYears(endDate, 5);
    
    const url = `${FRED_API_BASE}/series/observations?series_id=CPIAUCSL&api_key=${API_KEY}&file_type=json&observation_start=${format(startDate, 'yyyy-MM-dd')}&observation_end=${format(endDate, 'yyyy-MM-dd')}&frequency=a`;
    
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
        displayDate: new Date(obs.date).getFullYear().toString()
      }))
      .slice(-5);
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error fetching CPI data:', error);
    return NextResponse.json({ error: 'Failed to fetch CPI data' }, { status: 500 });
  }
}