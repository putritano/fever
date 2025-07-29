import React from 'react';
import { TradingSignal } from '../types/trading';
import { TrendingUp, TrendingDown, Minus, Target, Shield, DollarSign } from 'lucide-react';

interface TradingSignalsProps {
  signals: TradingSignal[];
}

export const TradingSignals: React.FC<TradingSignalsProps> = ({ signals }) => {
  const getSignalColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-400 bg-green-900/20 border-green-700';
      case 'SELL': return 'text-red-400 bg-red-900/20 border-red-700';
      default: return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
    }
  };

  const getSignalIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-5 h-5" />;
      case 'SELL': return <TrendingDown className="w-5 h-5" />;
      default: return <Minus className="w-5 h-5" />;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'VERY_STRONG': return 'text-purple-400 bg-purple-900/20 border-purple-700';
      case 'STRONG': return 'text-blue-400 bg-blue-900/20 border-blue-700';
      case 'MODERATE': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  const getConfidenceBar = (confidence: number) => {
    const width = Math.max(confidence, 10);
    let colorClass = 'bg-gray-500';
    if (confidence >= 70) colorClass = 'bg-green-500';
    else if (confidence >= 50) colorClass = 'bg-yellow-500';
    else if (confidence >= 30) colorClass = 'bg-orange-500';
    else colorClass = 'bg-red-500';

    return (
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Current Tick Analysis</h3>
      <div className="space-y-4">
        {signals.map((signal, index) => (
          <div key={index} className={`border rounded-lg p-4 ${getSignalColor(signal.action)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getSignalIcon(signal.action)}
                <span className="font-semibold">{signal.action} NOW</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStrengthColor(signal.strength)}`}>
                  {signal.strength}
                </span>
              </div>
              <div className="text-sm">
                Win Rate: {signal.probability}%
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Confidence</span>
                <span>{signal.confidence}%</span>
              </div>
              {getConfidenceBar(signal.confidence)}
            </div>
            
            <div className="text-sm opacity-80">
              <strong>Analysis:</strong> {signal.reason}
            </div>
            
            {signal.action !== 'HOLD' && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-1">
                  <DollarSign className="w-3 h-3 text-green-400" />
                  <div>
                    <div className="text-gray-400">Entry</div>
                    <div className="font-semibold">${signal.entry_price.toFixed(2)}</div>
                  </div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-red-400" />
                  <div>
                    <div className="text-gray-400">Stop Loss</div>
                    <div className="font-semibold">${signal.stop_loss.toFixed(2)}</div>
                  </div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded flex items-center space-x-1">
                  <Target className="w-3 h-3 text-blue-400" />
                  <div>
                    <div className="text-gray-400">Take Profit</div>
                    <div className="font-semibold">${signal.take_profit.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-400">
              Updated: {new Date(signal.timestamp).toLocaleTimeString('vi-VN')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};