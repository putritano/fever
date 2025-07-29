export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

export interface ProcessedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
}

export interface TradingSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: number;
  reason: string;
  probability: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
}

export interface MarketAnalysis {
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  momentum: 'STRONG' | 'WEAK' | 'NEUTRAL';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  signals: TradingSignal[];
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface PredictionModel {
  winRate: number;
  accuracy: number;
  totalSignals: number;
  successfulSignals: number;
}