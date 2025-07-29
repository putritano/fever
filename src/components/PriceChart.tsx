// Trong components/PriceChart.tsx (ví dụ)
import React, { useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, BarPrices } from 'lightweight-charts';
import { ProcessedCandle, TradingSignal } from '../types/trading';

interface PriceChartProps {
  candles: ProcessedCandle[];
  signals?: TradingSignal[];
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

    // THÊM DÒNG NÀY ĐỂ DEBUG
    console.log("Chart object after createChart:", chart);

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({ // Dòng gây lỗi
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    });
    candlestickSeriesRef.current = candlestickSeries;

    const chartData: CandlestickData[] = candles.map(c => ({
      time: c.timestamp / 1000 as CandlestickData['time'],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeries.setData(chartData);

    const markers = signals
      .filter(signal => signal.action !== 'HOLD')
      .map(signal => {
        const candleForSignal = candles.find(c => Math.abs(c.timestamp - signal.timestamp) < 5000);
        if (!candleForSignal) return null;

        return {
          time: signal.timestamp / 1000 as CandlestickData['time'],
          position: signal.action === 'BUY' ? 'belowBar' : 'aboveBar',
          color: signal.action === 'BUY' ? '#22c55e' : '#ef4444',
          shape: signal.action === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${signal.action} @ ${signal.entry_price.toFixed(2)}`,
        };
      })
      .filter(Boolean);

    if (markers.length > 0) {
      candlestickSeries.setMarkers(markers as any[]);
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
  }, [candles, signals, width, height]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: `${height}px` }} />;
};