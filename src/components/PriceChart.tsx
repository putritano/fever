import React, { useRef, useEffect } from 'react';
import { ProcessedCandle } from '../types/trading';

interface PriceChartProps {
  candles: ProcessedCandle[];
  width?: number;
  height?: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ 
  candles, 
  width = 800, 
  height = 400 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!candles.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Chart margins
    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Helper functions
    const getX = (index: number) => margin.left + (index / (candles.length - 1)) * chartWidth;
    const getY = (price: number) => margin.top + ((maxPrice - price) / priceRange) * chartHeight;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = margin.left + (i / 10) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, chartWidth / candles.length * 0.8);
    
    candles.forEach((candle, index) => {
      const x = getX(index);
      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);

      const isGreen = candle.close > candle.open;
      ctx.strokeStyle = isGreen ? '#10B981' : '#EF4444';
      ctx.fillStyle = isGreen ? '#10B981' : '#EF4444';

      // Draw wick
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      
      if (bodyHeight > 1) {
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      } else {
        // Doji - draw line
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - candleWidth / 2, openY);
        ctx.lineTo(x + candleWidth / 2, openY);
        ctx.stroke();
      }
    });

    // Draw price labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (i / 5) * priceRange;
      const y = margin.top + (i / 5) * chartHeight;
      ctx.fillText(price.toFixed(2), width - margin.right + 5, y + 4);
    }

    // Draw current price
    const currentPrice = candles[candles.length - 1].close;
    const currentY = getY(currentPrice);
    
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(margin.left, currentY);
    ctx.lineTo(width - margin.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`$${currentPrice.toFixed(2)}`, width - margin.right + 5, currentY + 4);

  }, [candles, width, height]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">BTC/USDT Price Chart</h3>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-gray-900 rounded border border-gray-700"
      />
    </div>
  );
};