import { useState, useEffect, useCallback } from 'react';
import { KlineData, ProcessedCandle } from '../types/trading';

export const useBinanceData = (updateInterval: number = 5000) => {
  const [candles, setCandles] = useState<ProcessedCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setIsConnected(false);
      const response = await fetch(
        'https://api.binance.com/api/v3/klines?symbol=EURUSDT&interval=1m&limit=1000'
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: KlineData[] = await response.json();
      
      const processedCandles: ProcessedCandle[] = data.map((kline) => ({
        timestamp: kline[0] as number,
        open: parseFloat(kline[1] as string),
        high: parseFloat(kline[2] as string),
        low: parseFloat(kline[3] as string),
        close: parseFloat(kline[4] as string),
        volume: parseFloat(kline[5] as string)
      }));
      
      setCandles(processedCandles);
      setLastUpdate(new Date());
      setLoading(false);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Update based on provided interval (default 5 seconds for real-time)
    const interval = setInterval(fetchData, updateInterval);
    
    return () => clearInterval(interval);
  }, [fetchData, updateInterval]);

  return {
    candles,
    loading,
    error,
    lastUpdate,
    isConnected,
    refetch: fetchData
  };
};