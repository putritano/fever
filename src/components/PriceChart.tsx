// Trong components/PriceChart.tsx (ví dụ)
import React, { useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, BarPrices } from 'lightweight-charts';
import { ProcessedCandle, TradingSignal } from '../types/trading'; // Import TradingSignal

interface PriceChartProps {
  candles: ProcessedCandle[];
  signals?: TradingSignal[]; // Thêm prop signals
  width: number;
  height: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ candles, signals = [], width, height }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',   // green
      downColor: '#ef4444', // red
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Map your candle data to the format required by lightweight-charts
    const chartData: CandlestickData[] = candles.map(c => ({
      time: c.timestamp / 1000 as CandlestickData['time'], // Unix timestamp in seconds
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeries.setData(chartData);

    // Add markers for signals
    const markers = signals
      .filter(signal => signal.action !== 'HOLD') // Only show BUY/SELL signals
      .map(signal => {
        // Find the corresponding candle to place the marker
        const candleForSignal = candles.find(c => Math.abs(c.timestamp - signal.timestamp) < 5000); // within 5 seconds
        if (!candleForSignal) return null;

        return {
          time: signal.timestamp / 1000 as CandlestickData['time'],
          position: signal.action === 'BUY' ? 'belowBar' : 'aboveBar',
          color: signal.action === 'BUY' ? '#22c55e' : '#ef4444', // green for buy, red for sell
          shape: signal.action === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${signal.action} @ ${signal.entry_price.toFixed(2)}`,
        };
      })
      .filter(Boolean); // Remove null entries

    if (markers.length > 0) {
      candlestickSeries.setMarkers(markers as any[]); // Type assertion might be needed depending on lightweight-charts version
    }


    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.offsetWidth || width });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, signals, width, height]); // Thêm signals vào dependency array

  return <div ref={chartContainerRef} style={{ width: '100%', height: `${height}px` }} />;
};