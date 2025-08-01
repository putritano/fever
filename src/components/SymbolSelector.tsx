import React, { useState } from 'react';
import { TradingSymbol } from '../types/trading';
import { AVAILABLE_SYMBOLS, getSymbolsByCategory } from '../config/symbols';
import { ChevronDown, Search, TrendingUp } from 'lucide-react';

interface SymbolSelectorProps {
  currentSymbol: TradingSymbol;
  onSymbolChange: (symbol: TradingSymbol) => void;
}

export const SymbolSelector: React.FC<SymbolSelectorProps> = ({
  currentSymbol,
  onSymbolChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FOREX' | 'CRYPTO' | 'STOCK'>('ALL');

  const filteredSymbols = AVAILABLE_SYMBOLS.filter(symbol => {
    const matchesSearch = symbol.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || symbol.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSymbolSelect = (symbol: TradingSymbol) => {
    onSymbolChange(symbol);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'FOREX': return 'text-blue-400 bg-blue-900/20';
      case 'CRYPTO': return 'text-orange-400 bg-orange-900/20';
      case 'STOCK': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <TrendingUp className="w-4 h-4" />
        <span className="font-medium">{currentSymbol.displayName}</span>
        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(currentSymbol.category)}`}>
          {currentSymbol.category}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-700">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              {['ALL', 'FOREX', 'CRYPTO', 'STOCK'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as any)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredSymbols.map((symbol) => (
              <button
                key={symbol.symbol}
                onClick={() => handleSymbolSelect(symbol)}
                className={`w-full text-left p-3 hover:bg-gray-700 transition-colors ${
                  currentSymbol.symbol === symbol.symbol ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{symbol.displayName}</div>
                    <div className="text-sm text-gray-400">{symbol.description}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(symbol.category)}`}>
                    {symbol.category}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredSymbols.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              No symbols found matching your criteria
            </div>
          )}
        </div>
      )}
    </div>
  );
};