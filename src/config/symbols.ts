import { TradingSymbol } from '../types/trading';

export const AVAILABLE_SYMBOLS: TradingSymbol[] = [
  // Forex Pairs
  {
    symbol: 'EURUSDT',
    displayName: 'EUR/USDT',
    baseAsset: 'EUR',
    quoteAsset: 'USDT',
    tickSize: 0.00001,
    minPrice: 0.00001,
    maxPrice: 10,
    priceDecimals: 5,
    category: 'FOREX',
    description: 'Euro vs US Dollar Tether'
  },
  {
    symbol: 'GBPUSDT',
    displayName: 'GBP/USDT',
    baseAsset: 'GBP',
    quoteAsset: 'USDT',
    tickSize: 0.00001,
    minPrice: 0.00001,
    maxPrice: 10,
    priceDecimals: 5,
    category: 'FOREX',
    description: 'British Pound vs US Dollar Tether'
  },
  {
    symbol: 'JPYUSDT',
    displayName: 'JPY/USDT',
    baseAsset: 'JPY',
    quoteAsset: 'USDT',
    tickSize: 0.000001,
    minPrice: 0.000001,
    maxPrice: 1,
    priceDecimals: 6,
    category: 'FOREX',
    description: 'Japanese Yen vs US Dollar Tether'
  },
  {
    symbol: 'AUDUSDT',
    displayName: 'AUD/USDT',
    baseAsset: 'AUD',
    quoteAsset: 'USDT',
    tickSize: 0.00001,
    minPrice: 0.00001,
    maxPrice: 10,
    priceDecimals: 5,
    category: 'FOREX',
    description: 'Australian Dollar vs US Dollar Tether'
  },
  // Major Cryptocurrencies
  {
    symbol: 'BTCUSDT',
    displayName: 'BTC/USDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    tickSize: 0.01,
    minPrice: 0.01,
    maxPrice: 1000000,
    priceDecimals: 2,
    category: 'CRYPTO',
    description: 'Bitcoin vs US Dollar Tether'
  },
  {
    symbol: 'ETHUSDT',
    displayName: 'ETH/USDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    tickSize: 0.01,
    minPrice: 0.01,
    maxPrice: 100000,
    priceDecimals: 2,
    category: 'CRYPTO',
    description: 'Ethereum vs US Dollar Tether'
  },
  {
    symbol: 'BNBUSDT',
    displayName: 'BNB/USDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    tickSize: 0.01,
    minPrice: 0.01,
    maxPrice: 10000,
    priceDecimals: 2,
    category: 'CRYPTO',
    description: 'Binance Coin vs US Dollar Tether'
  },
  {
    symbol: 'ADAUSDT',
    displayName: 'ADA/USDT',
    baseAsset: 'ADA',
    quoteAsset: 'USDT',
    tickSize: 0.0001,
    minPrice: 0.0001,
    maxPrice: 100,
    priceDecimals: 4,
    category: 'CRYPTO',
    description: 'Cardano vs US Dollar Tether'
  },
  {
    symbol: 'SOLUSDT',
    displayName: 'SOL/USDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    tickSize: 0.01,
    minPrice: 0.01,
    maxPrice: 10000,
    priceDecimals: 2,
    category: 'CRYPTO',
    description: 'Solana vs US Dollar Tether'
  },
  {
    symbol: 'XRPUSDT',
    displayName: 'XRP/USDT',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    tickSize: 0.0001,
    minPrice: 0.0001,
    maxPrice: 100,
    priceDecimals: 4,
    category: 'CRYPTO',
    description: 'Ripple vs US Dollar Tether'
  }
];

export const DEFAULT_SYMBOL = AVAILABLE_SYMBOLS[0]; // EUR/USDT as default

export const getSymbolByName = (symbolName: string): TradingSymbol | undefined => {
  return AVAILABLE_SYMBOLS.find(s => s.symbol === symbolName);
};

export const getSymbolsByCategory = (category: 'FOREX' | 'CRYPTO' | 'STOCK'): TradingSymbol[] => {
  return AVAILABLE_SYMBOLS.filter(s => s.category === category);
};