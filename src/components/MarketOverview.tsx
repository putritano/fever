import React from 'react';
import { MarketAnalysis, TechnicalIndicators, TradingSymbol } from '../types/trading';
import { BarChart3, Activity, TrendingUp } from 'lucide-react';

interface MarketOverviewProps {
  analysis: MarketAnalysis;
  indicators: TechnicalIndicators;
  symbol: TradingSymbol;
  currentPrice: number;
  priceChange: number;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  analysis,
  indicators,
  symbol,
  currentPrice,
  priceChange
}) => {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return 'text-green-400 bg-green-900/20';
      case 'BEARISH': return 'text-red-400 bg-red-900/20';
      default: return 'text-yellow-400 bg-yellow-900/20';
    }
  };

  const getMomentumColor = (momentum: string) => {
    switch (momentum) {
      case 'STRONG': return 'text-blue-400';
      case 'WEAK': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <BarChart3 className="w-5 h-5" />
        <span>Market Overview</span>
      </h3>
      
      {/* Current Price */}
      <div className="mb-6 p-4 bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white">
              ${currentPrice.toFixed(symbol.priceDecimals)}
            </div>
            <div className="text-sm text-gray-400">{symbol.displayName}</div>
          </div>
          <div className={`text-right ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <div className="text-lg font-semibold">
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </div>
            <div className="text-sm">24h Change</div>
          </div>
        </div>
      </div>

      {/* Market Status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`p-3 rounded-lg ${getTrendColor(analysis.trend)}`}>
          <div className="text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-1" />
            <div className="font-semibold">{analysis.trend}</div>
            <div className="text-xs opacity-80">Trend</div>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg bg-gray-900/50 ${getMomentumColor(analysis.momentum)}`}>
          <div className="text-center">
            <Activity className="w-6 h-6 mx-auto mb-1" />
            <div className="font-semibold">{analysis.momentum}</div>
            <div className="text-xs opacity-80">Momentum</div>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg bg-gray-900/50 ${getVolatilityColor(analysis.volatility)}`}>
          <div className="text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-1" />
            <div className="font-semibold">{analysis.volatility}</div>
            <div className="text-xs opacity-80">Volatility</div>
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="space-y-3">
        <h4 className="font-semibold text-white">Technical Indicators</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900/50 p-3 rounded">
            <div className="text-sm text-gray-400">RSI (14)</div>
            <div className={`font-semibold ${
              indicators.rsi > 70 ? 'text-red-400' : 
              indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {indicators.rsi.toFixed(1)}
              {indicators.rsi > 70 && <span className="text-xs ml-1">Overbought</span>}
              {indicators.rsi < 30 && <span className="text-xs ml-1">Oversold</span>}
            </div>
          </div>
          
          <div className="bg-gray-900/50 p-3 rounded">
            <div className="text-sm text-gray-400">MACD</div>
            <div className={`font-semibold ${
              indicators.macd > indicators.macdSignal ? 'text-green-400' : 'text-red-400'
            }`}>
              {indicators.macd.toFixed(symbol.category === 'CRYPTO' ? 2 : 6)}
            </div>
          </div>
          
          <div className="bg-gray-900/50 p-3 rounded">
            <div className="text-sm text-gray-400">SMA 20</div>
            <div className={`font-semibold ${
              currentPrice > indicators.sma20 ? 'text-green-400' : 'text-red-400'
            }`}>
              ${indicators.sma20.toFixed(symbol.priceDecimals)}
            </div>
          </div>
          
          <div className="bg-gray-900/50 p-3 rounded">
            <div className="text-sm text-gray-400">EMA 12/26</div>
            <div className={`font-semibold ${
              indicators.ema12 > indicators.ema26 ? 'text-green-400' : 'text-red-400'
            }`}>
              {indicators.ema12 > indicators.ema26 ? 'Bullish' : 'Bearish'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};