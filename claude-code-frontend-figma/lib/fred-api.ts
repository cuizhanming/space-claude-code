export interface ChartDataPoint {
  date: string;
  value: number;
  displayDate: string;
}

const apiFetcher = async (url: string): Promise<ChartDataPoint[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchCPIData = async (): Promise<ChartDataPoint[]> => {
  try {
    return await apiFetcher('/api/fred/cpi');
  } catch (error) {
    console.error('Error fetching CPI data:', error);
    return [];
  }
};

export const fetchUnemploymentData = async (): Promise<ChartDataPoint[]> => {
  try {
    return await apiFetcher('/api/fred/unemployment');
  } catch (error) {
    console.error('Error fetching unemployment data:', error);
    return [];
  }
};

export const fetch10YearTreasuryData = async (): Promise<ChartDataPoint[]> => {
  try {
    return await apiFetcher('/api/fred/treasury-10year');
  } catch (error) {
    console.error('Error fetching 10-year treasury data:', error);
    return [];
  }
};

export const fetch3MonthTreasuryData = async (): Promise<ChartDataPoint[]> => {
  try {
    return await apiFetcher('/api/fred/treasury-3month');
  } catch (error) {
    console.error('Error fetching 3-month treasury data:', error);
    return [];
  }
};