import { ProcessedCandle, TechnicalIndicators, TradingSignal, MarketAnalysis } from '../types/trading';
import { GeminiService } from '../services/geminiService';

export class TechnicalAnalyzer {
  private static geminiService = new GeminiService();

  static calculateSMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  static calculateEMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    
    // Use SMA for initial EMA value
    let ema = this.calculateSMA(data.slice(0, period), period);
    if (ema === 0) return 0;
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  static calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;
    
    // Calculate initial average gain and loss
    let gains: number[] = [];
    let losses: number[] = [];
    
    // Get price changes for the period
    for (let i = 1; i <= period; i++) {
      const index = closes.length - period - 1 + i;
      if (index < 1) continue;
      
      const change = closes[index] - closes[index - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }
    
    if (gains.length === 0) return 50;
    
    // Calculate average gain and loss using Wilder's smoothing
    let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
    
    // Apply Wilder's smoothing for remaining periods
    for (let i = closes.length - period; i < closes.length; i++) {
      if (i < 1) continue;
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  static calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;
    
    // Calculate MACD line for recent periods to get signal line
    const macdLine: number[] = [];
    for (let i = 26; i <= closes.length; i++) {
      const slice = closes.slice(0, i);
      const ema12_i = this.calculateEMA(slice, 12);
      const ema26_i = this.calculateEMA(slice, 26);
      macdLine.push(ema12_i - ema26_i);
    }
    
    // Calculate 9-period EMA of MACD line for signal
    const signal = macdLine.length >= 9 ? this.calculateEMA(macdLine, 9) : macd;
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  static getTechnicalIndicators(candles: ProcessedCandle[]): TechnicalIndicators {
    const closes = candles.map(c => c.close);
    const macdData = this.calculateMACD(closes);
    
    return {
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50), // Keep for compatibility
      ema12: this.calculateEMA(closes, 12),
      ema26: this.calculateEMA(closes, 26),
      rsi: this.calculateRSI(closes),
      macd: macdData.macd,
      macdSignal: macdData.signal,
      macdHistogram: macdData.histogram
    };
  }

  static analyzeMarket(candles: ProcessedCandle[]): MarketAnalysis {
    if (candles.length < 50) {
      // Not enough data for proper analysis
      return {
        trend: 'SIDEWAYS',
        momentum: 'NEUTRAL',
        volatility: 'MEDIUM',
        signals: [{
          action: 'HOLD',
          confidence: 25,
          timestamp: Date.now(),
          reason: 'Insufficient data for analysis',
          probability: 50,
          strength: 'WEAK',
          entry_price: candles[candles.length - 1].close,
          stop_loss: candles[candles.length - 1].close,
          take_profit: candles[candles.length - 1].close
        }]
      };
    }
    
    const indicators = this.getTechnicalIndicators(candles);
    const currentPrice = candles[candles.length - 1].close;
    const previousPrice = candles[candles.length - 2].close;
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Determine trend
    let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
    const sma50 = this.calculateSMA(candles.map(c => c.close), 50);
    
    if (currentPrice > indicators.sma20 && indicators.sma20 > sma50 && indicators.ema12 > indicators.ema26) {
      trend = 'BULLISH';
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < sma50 && indicators.ema12 < indicators.ema26) {
      trend = 'BEARISH';
    }
    
    // Determine momentum
    let momentum: 'STRONG' | 'WEAK' | 'NEUTRAL' = 'NEUTRAL';
    if (Math.abs(priceChange) > 0.01) { // Lower threshold for forex
      momentum = (indicators.rsi > 65 || indicators.rsi < 35) && Math.abs(indicators.macdHistogram) > 0.0001 ? 'STRONG' : 'WEAK';
    }
    
    // Determine volatility
    const volatility = this.calculateVolatility(candles);
    let volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (volatility > 0.15) volatilityLevel = 'HIGH'; // Lower threshold for forex
    else if (volatility < 0.05) volatilityLevel = 'LOW';
    
    // Generate trading signals
    const signals = this.generateTradingSignals(candles, indicators, trend, momentum);
    
    return {
      trend,
      momentum,
      volatility: volatilityLevel,
      signals
    };
  }

  static calculateVolatility(candles: ProcessedCandle[]): number {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const ret = Math.log(candles[i].close / candles[i - 1].close);
      returns.push(ret);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100;
  }

  static generateTradingSignals(
    candles: ProcessedCandle[], 
    indicators: TechnicalIndicators, 
    trend: string, 
    momentum: string
  ): TradingSignal[] {
    const currentPrice = candles[candles.length - 1].close;
    
    // Analyze current tick for immediate action
    const signal = this.calculateCurrentTickSignal(candles, indicators, currentPrice, trend, momentum);
    
    return [signal];
  }

  static async generateEnhancedTradingSignals(
    candles: ProcessedCandle[], 
    indicators: TechnicalIndicators, 
    trend: string, 
    momentum: string
  ): Promise<TradingSignal[]> {
    const currentPrice = candles[candles.length - 1].close;
    
    // Get basic technical analysis signal
    const basicSignal = this.calculateCurrentTickSignal(candles, indicators, currentPrice, trend, momentum);
    
    // Only enhance with AI if signal is BUY or SELL (not HOLD)
    if (basicSignal.action === 'BUY' || basicSignal.action === 'SELL') {
      console.log(`🤖 AI Enhancement triggered for ${basicSignal.action} signal`);
      const enhancedSignal = await this.geminiService.enhanceAnalysis(candles, indicators, basicSignal);
      return [enhancedSignal];
    }
    
    // Return basic signal for HOLD actions without AI enhancement
    return [basicSignal];
  }

  static calculateCurrentTickSignal(
    candles: ProcessedCandle[],
    indicators: TechnicalIndicators, 
    currentPrice: number, 
    trend: string, 
    momentum: string
  ): TradingSignal {
    let score = 0;
    let reasons: string[] = [];
    
    // Historical pattern analysis for win rate prediction
    const historicalAccuracy = this.calculateHistoricalAccuracy(candles, indicators);
    
    // RSI Analysis
    if (indicators.rsi < 30) {
      score += 3;
      reasons.push('RSI oversold (strong buy signal)');
    } else if (indicators.rsi > 70) {
      score -= 3;
      reasons.push('RSI overbought (strong sell signal)');
    } else if (indicators.rsi < 40) {
      score += 1;
      reasons.push('RSI approaching oversold');
    } else if (indicators.rsi > 60) {
      score -= 1;
      reasons.push('RSI approaching overbought');
    }
    
    // MACD Analysis
    if (indicators.macdHistogram > 0.0001) { // Adjusted threshold for forex
      if (indicators.macd > indicators.macdSignal) {
        score += 2;
        reasons.push('MACD bullish crossover');
      } else {
        score += 1;
        reasons.push('MACD histogram positive');
      }
    } else if (indicators.macdHistogram < -0.0001) {
      if (indicators.macd < indicators.macdSignal) {
        score -= 2;
        reasons.push('MACD bearish crossover');
      } else {
        score -= 1;
        reasons.push('MACD histogram negative');
      }
    }
    
    // Price vs Moving Averages
    if (currentPrice > indicators.sma20) {
      score += 2;
      reasons.push('Price above SMA20 (bullish)');
    } else {
      score -= 2;
      reasons.push('Price below SMA20 (bearish)');
    }
    
    if (indicators.ema12 > indicators.ema26) {
      score += 2;
      reasons.push('EMA bullish cross');
    } else {
      score -= 2;
      reasons.push('EMA bearish cross');
    }
    
    // Trend confirmation
    if (trend === 'BULLISH') {
      score += 2;
      reasons.push('Bullish trend');
    } else if (trend === 'BEARISH') {
      score -= 2;
      reasons.push('Bearish trend');
    }
    
    // Volume analysis
    const currentVolume = candles[candles.length - 1].volume;
    const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
    if (currentVolume > avgVolume * 1.3) { // Lower threshold for forex
      score += Math.sign(score) * 1; // Amplify existing signal
      reasons.push('High volume confirmation');
    }
    
    // Determine action and confidence
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let probability = 50;
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
    
    if (score >= 8) {
      action = 'BUY';
      confidence = Math.min(score * 8, 95);
      probability = Math.min(65 + score * 3, 85);
      strength = score >= 12 ? 'VERY_STRONG' : score >= 10 ? 'STRONG' : 'MODERATE';
    } else if (score <= -8) {
      action = 'SELL';
      confidence = Math.min(Math.abs(score) * 8, 95);
      probability = Math.min(65 + Math.abs(score) * 3, 85);
      strength = score <= -12 ? 'VERY_STRONG' : score <= -10 ? 'STRONG' : 'MODERATE';
    } else if (score >= 5) {
      action = 'BUY';
      confidence = score * 10;
      probability = 55 + score * 2;
      strength = 'MODERATE';
    } else if (score <= -5) {
      action = 'SELL';
      confidence = Math.abs(score) * 10;
      probability = 55 + Math.abs(score) * 2;
      strength = 'MODERATE';
    } else {
      confidence = 25;
      probability = 50;
      strength = 'WEAK';
    }
    
    // Apply historical accuracy
    probability = Math.round(probability * historicalAccuracy);
    
    // Calculate stop loss and take profit
    const atr = this.calculateATR(candles.slice(-14));
    const stopLoss = action === 'BUY' ? currentPrice - (atr * 2.0) : currentPrice + (atr * 2.0);
    const takeProfit = action === 'BUY' ? currentPrice + (atr * 3.0) : currentPrice - (atr * 3.0);
    
    return {
      action,
      confidence: Math.round(confidence),
      timestamp: Date.now(),
      reason: reasons.join(', '),
      probability: Math.round(probability),
      strength,
      entry_price: currentPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit
    };
  }

  static calculateATR(candles: ProcessedCandle[], period: number = 14): number {
    if (candles.length < period + 1) return 0;
    
    let trSum = 0;
    for (let i = 1; i < Math.min(candles.length, period + 1); i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trSum += tr;
    }
    
    return trSum / period;
  }

  static calculateHistoricalAccuracy(candles: ProcessedCandle[], indicators: TechnicalIndicators): number {
    // Simplified historical accuracy calculation
    // In a real implementation, you would backtest your strategy
    let accuracy = 0.75; // Base accuracy
    
    // Adjust based on market conditions
    if (indicators.rsi > 70 || indicators.rsi < 30) {
      accuracy += 0.1; // Higher accuracy in extreme conditions
    }
    
    if (Math.abs(indicators.macdHistogram) > 0.1) {
      accuracy += 0.05; // Better accuracy with strong MACD signals
    }
    
    return Math.min(accuracy, 0.95);
  }
}