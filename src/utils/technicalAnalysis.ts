import { ProcessedCandle, TechnicalIndicators, TradingSignal, MarketAnalysis } from '../types/trading';
import { GeminiService } from '../services/geminiService'; // Đảm bảo đường dẫn đúng

export class TechnicalAnalyzer {
    // Khởi tạo GeminiService. Đảm bảo bạn đã có file services/geminiService.ts
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
        if (ema === 0) return 0; // Xử lý trường hợp SMA ban đầu là 0

        for (let i = period; i < data.length; i++) {
            ema = (data[i] * multiplier) + (ema * (1 - multiplier));
        }

        return ema;
    }

    static calculateRSI(closes: number[], period: number = 14): number {
        if (closes.length < period + 1) return 50;

        let gains: number[] = [];
        let losses: number[] = [];

        // Get price changes for the initial period
        for (let i = closes.length - period; i < closes.length; i++) {
            if (i < 1) continue; // Ensure we have a previous close
            const change = closes[i] - closes[i - 1];
            if (change > 0) {
                gains.push(change);
                losses.push(0);
            } else {
                gains.push(0);
                losses.push(Math.abs(change));
            }
        }

        if (gains.length === 0) return 50; // Should not happen if closes.length >= period + 1

        let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
        let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

        if (avgLoss === 0) return 100;
        if (avgGain === 0) return 0;

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    static calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
        if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };

        // Ensure enough data for EMA calculations before slicing
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);

        if (ema12 === 0 || ema26 === 0) return { macd: 0, signal: 0, histogram: 0 }; // Handle insufficient data in EMA

        const macd = ema12 - ema26;

        // Calculate MACD line for recent periods to get signal line
        const macdLine: number[] = [];
        // Start from index 25 (0-indexed) to ensure enough data for EMA26 for each point
        for (let i = 25; i < closes.length; i++) {
            const slice = closes.slice(0, i + 1); // Slice up to current candle for EMA calculation
            const ema12_i = this.calculateEMA(slice, 12);
            const ema26_i = this.calculateEMA(slice, 26);
            // Push only if valid numbers
            if (!isNaN(ema12_i) && !isNaN(ema26_i) && ema12_i !== 0 && ema26_i !== 0) {
                macdLine.push(ema12_i - ema26_i);
            }
        }

        const signal = macdLine.length >= 9 ? this.calculateEMA(macdLine, 9) : macd; // Fallback to macd if not enough data for signal
        const histogram = macd - signal;

        return { macd, signal, histogram };
    }

    static calculateATR(candles: ProcessedCandle[], period: number = 14): number {
        if (candles.length < period) return 0; // Need at least `period` candles for calculation

        let trueRanges: number[] = [];
        // Start from the first candle that has a previous close
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        if (trueRanges.length === 0) return 0;

        // Calculate EMA of True Ranges for ATR (standard method)
        return this.calculateEMA(trueRanges, period);
    }

    static getTechnicalIndicators(candles: ProcessedCandle[]): TechnicalIndicators {
        // Fix for "currentPrice is not defined" error in trend calculation
        if (candles.length === 0) {
            return {
                sma20: 0, sma50: 0, ema12: 0, ema26: 0, rsi: 50,
                macd: 0, macdSignal: 0, macdHistogram: 0, atr: 0,
                volume: 0, avgVolume: 0,
                trend: 'UNDEFINED', momentum: 'NEUTRAL'
            };
        }
        const currentPrice = candles[candles.length - 1].close;

        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume);

        const sma20 = this.calculateSMA(closes, 20);
        const sma50 = this.calculateSMA(closes, 50);
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        const rsi = this.calculateRSI(closes);
        const macdData = this.calculateMACD(closes);
        const atr = this.calculateATR(candles, 14); // Calculate ATR here

        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.length >= 20 ? volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20 : 0; // Avg last 20

        // Determine trend
        let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'UNDEFINED' = 'SIDEWAYS';
        if (!isNaN(ema12) && !isNaN(ema26) && !isNaN(sma20) && sma50 !== 0) { // Ensure indicators are valid
            if (ema12 > ema26 && currentPrice > sma20 && currentPrice > sma50) {
                trend = 'BULLISH';
            } else if (ema12 < ema26 && currentPrice < sma20 && currentPrice < sma50) {
                trend = 'BEARISH';
            }
        } else {
            trend = 'UNDEFINED'; // Not enough data for a clear trend
        }

        // Determine momentum
        let momentum: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' | 'UNDEFINED' = 'NEUTRAL';
        const priceChange = ((currentPrice - candles[candles.length - 2]?.close) / candles[candles.length - 2]?.close) * 100 || 0;

        // Lower thresholds for forex volatility
        const macdHistThresholdStrong = 0.00005; // Reduced from 0.0001
        const macdHistThresholdWeak = 0.00001; // Further reduced for UP/DOWN

        if (macdData.histogram > macdHistThresholdStrong && priceChange > 0) {
            momentum = 'STRONG_UP';
        } else if (macdData.histogram > 0) {
            momentum = 'UP';
        } else if (macdData.histogram < -macdHistThresholdStrong && priceChange < 0) {
            momentum = 'STRONG_DOWN';
        } else if (macdData.histogram < 0) {
            momentum = 'DOWN';
        }


        return {
            sma20,
            sma50,
            ema12,
            ema26,
            rsi,
            macd: macdData.macd,
            macdSignal: macdData.signal,
            macdHistogram: macdData.histogram,
            atr, // Bao gồm ATR
            volume: currentVolume,
            avgVolume,
            trend,
            momentum
        };
    }

    static analyzeMarket(candles: ProcessedCandle[]): MarketAnalysis {
        const currentCandle = candles[candles.length - 1];

        if (candles.length < 50 || !currentCandle) { // Ensure enough data for proper analysis and a current candle
            return {
                trend: 'SIDEWAYS',
                momentum: 'NEUTRAL',
                volatility: 'MEDIUM', // Mặc định nếu không đủ dữ liệu
                signals: [{
                    action: 'HOLD',
                    confidence: 25,
                    timestamp: Date.now(),
                    reason: 'Insufficient data for analysis',
                    probability: 50,
                    strength: 'WEAK',
                    entry_price: currentCandle ? currentCandle.close : 0,
                    stop_loss: currentCandle ? currentCandle.close : 0,
                    take_profit: currentCandle ? currentCandle.close : 0
                }]
            };
        }

        const indicators = this.getTechnicalIndicators(candles);
        // Ensure indicators are valid before proceeding
        if (!indicators || isNaN(indicators.ema12) || isNaN(indicators.ema26)) {
             return {
                trend: 'UNDEFINED',
                momentum: 'NEUTRAL',
                volatility: 'MEDIUM',
                signals: [{
                    action: 'HOLD',
                    confidence: 25,
                    timestamp: Date.now(),
                    reason: 'Failed to calculate indicators.',
                    probability: 50,
                    strength: 'WEAK',
                    entry_price: currentCandle.close,
                    stop_loss: currentCandle.close,
                    take_profit: currentCandle.close
                }]
            };
        }


        const currentPrice = currentCandle.close;
        const previousPrice = candles[candles.length - 2]?.close || currentPrice; // Dùng currentPrice nếu không có nến trước
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

        // Determine trend (using indicators from getTechnicalIndicators)
        const trend = indicators.trend;

        // Determine momentum (using indicators from getTechnicalIndicators)
        const momentum = indicators.momentum;

        // Determine volatility
        const volatility = this.calculateVolatility(candles);
        let volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        // Điều chỉnh ngưỡng biến động cho Forex
        if (volatility > 0.005) volatilityLevel = 'HIGH'; // Ví dụ: > 0.005% biến động trung bình ngày
        else if (volatility < 0.001) volatilityLevel = 'LOW'; // Ví dụ: < 0.001% biến động trung bình ngày

        // Generate trading signals
        const signals = this.generateTradingSignals(candles, indicators, currentPrice, trend, momentum);

        return {
            trend,
            momentum,
            volatility: volatilityLevel,
            signals
        };
    }

    static calculateVolatility(candles: ProcessedCandle[]): number {
        if (candles.length < 2) return 0;
        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            const ret = Math.log(candles[i].close / candles[i - 1].close);
            returns.push(ret);
        }

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

        // Return as percentage, adjusted for forex
        return Math.sqrt(variance) * 100;
    }

    static generateTradingSignals(
        candles: ProcessedCandle[],
        indicators: TechnicalIndicators,
        currentPrice: number,
        trend: string,
        momentum: string
    ): TradingSignal[] {
        // Analyze current tick for immediate action
        const signal = this.calculateCurrentTickSignal(candles, indicators, currentPrice, trend, momentum);

        return [signal];
    }

    // Phương thức để gọi AI Enhancement (đã tích hợp GeminiService)
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
        // Đây là nơi AI Gemini được gọi
        if (basicSignal.action === 'BUY' || basicSignal.action === 'SELL') {
            console.log(`🤖 AI Enhancement triggered for ${basicSignal.action} signal`);
            // Gọi dịch vụ Gemini để nhận tín hiệu được cải thiện
            // Đảm bảo GeminiService.enhanceAnalysis chấp nhận các tham số này
            const enhancedSignal = await this.geminiService.enhanceAnalysis(candles, indicators, basicSignal);
            return [enhancedSignal];
        }

        // Return basic signal for HOLD actions without AI enhancement
        return [basicSignal];
    }

    // Phương thức tính toán tín hiệu cho một tick/nến cụ thể (đã điều chỉnh độ nhạy cho EURUSDT)
    static calculateCurrentTickSignal(
        candles: ProcessedCandle[], // Cần truyền toàn bộ candles để tính toán ATR và Volume
        indicators: TechnicalIndicators,
        currentPrice: number,
        trend: string,
        momentum: string
    ): TradingSignal {
        let score = 0;
        let reasons: string[] = [];

        // 1. RSI (Relative Strength Index) - Điều chỉnh ngưỡng cho EURUSDT M1 để nhạy hơn
        if (indicators.rsi < 35) { // Ngưỡng quá bán
            score += 3;
            reasons.push('RSI oversold (strong buy signal)');
        } else if (indicators.rsi < 45) { // Ngưỡng gần quá bán
            score += 1;
            reasons.push('RSI approaching oversold');
        }

        if (indicators.rsi > 65) { // Ngưỡng quá mua
            score -= 3;
            reasons.push('RSI overbought (strong sell signal)');
        } else if (indicators.rsi > 55) { // Ngưỡng gần quá mua
            score -= 1;
            reasons.push('RSI approaching overbought');
        }

        // 2. MACD (Moving Average Convergence Divergence) - Điều chỉnh ngưỡng histogram cho EURUSDT
        const macdThreshold = 0.00001; // Ngưỡng cực nhỏ để bắt các biến động nhỏ

        if (indicators.macdHistogram > macdThreshold && indicators.macd > indicators.macdSignal) {
            score += 2; // MACD Bullish crossover with positive histogram
            reasons.push('MACD bullish crossover');
        } else if (indicators.macdHistogram > 0) {
            score += 1; // MACD Histogram dương
            reasons.push('MACD histogram positive');
        }

        if (indicators.macdHistogram < -macdThreshold && indicators.macd < indicators.macdSignal) {
            score -= 2; // MACD Bearish crossover with negative histogram
            reasons.push('MACD bearish crossover');
        } else if (indicators.macdHistogram < 0) {
            score -= 1; // MACD Histogram âm
            reasons.push('MACD histogram negative');
        }

        // 3. Price vs Moving Averages
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

        // 4. Trend confirmation (sử dụng trend từ analyzeMarket)
        if (trend === 'BULLISH') {
            score += 2;
            reasons.push('Bullish trend');
        } else if (trend === 'BEARISH') {
            score -= 2;
            reasons.push('Bearish trend');
        }

        // 5. Volume analysis - Điều chỉnh ngưỡng cao hơn cho Forex M1 (nhiều nhiễu)
        const currentVolume = candles[candles.length - 1].volume;
        // Đảm bảo avgVolume được tính đúng từ indicators hoặc từ dữ liệu nến
        const avgVolume = indicators.avgVolume > 0 ? indicators.avgVolume :
                          (candles.length >= 20 ? candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20 : 1); // Fallback to 1 to avoid div by zero
        
        if (currentVolume > avgVolume * 2) { // Yêu cầu volume gấp đôi trung bình để xác nhận
             score += Math.sign(score) * 1; // Khuếch đại tín hiệu hiện có (nếu có)
             reasons.push('High volume confirmation');
        }


        // 6. Volatility (đã được tính và có thể sử dụng nếu muốn ảnh hưởng đến score)
        // Hiện tại không dùng trực tiếp để thêm/bớt score ở đây, nhưng có thể thêm nếu cần.

        // Xác định action và strength dựa trên score (đã điều chỉnh nhạy hơn)
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;
        let probability = 50;
        let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';

        if (score >= 5) { // MODERATE BUY
            action = 'BUY';
            if (score >= 12) { // VERY_STRONG BUY (từ 12 xuống 10)
                strength = 'VERY_STRONG';
                probability = 90;
            } else if (score >= 8) { // STRONG BUY (từ 8 xuống 7)
                strength = 'STRONG';
                probability = 80;
            } else {
                strength = 'MODERATE';
                probability = 65;
            }
        } else if (score <= -4) { // MODERATE SELL
            action = 'SELL';
            if (score <= -10) { // VERY_STRONG SELL (từ -12 xuống -10)
                strength = 'VERY_STRONG';
                probability = 90;
            } else if (score <= -7) { // STRONG SELL (từ -8 xuống -7)
                strength = 'STRONG';
                probability = 80;
            } else {
                strength = 'MODERATE';
                probability = 65;
            }
        } else {
            confidence = 25; // Base confidence for HOLD
            probability = 50; // Base probability for HOLD
            strength = 'WEAK';
            reasons.push('Market is consolidating or lacking clear direction.');
        }

        // Áp dụng historical accuracy (từ phương thức tính toán riêng)
        const historicalAccuracy = this.calculateHistoricalAccuracy(candles, indicators);
        probability = Math.round(probability * historicalAccuracy);

        // Tính toán Stop Loss và Take Profit dựa trên ATR
        // ATR được truyền từ indicators, đảm bảo nó là số hợp lệ
        const atr = indicators.atr && !isNaN(indicators.atr) && indicators.atr > 0 ? indicators.atr : 0.00005; // Fallback nhỏ nếu ATR không hợp lệ
        const riskRewardRatio = 1.5; // Tỷ lệ R:R mong muốn
        const atrMultiplier = 1.5; // Dùng 1.5 lần ATR cho SL/TP

        let stop_loss = 0;
        let take_profit = 0;

        if (action === 'BUY') {
            stop_loss = currentPrice - (atr * atrMultiplier);
            take_profit = currentPrice + (atr * atrMultiplier * riskRewardRatio);
        } else if (action === 'SELL') {
            stop_loss = currentPrice + (atr * atrMultiplier);
            take_profit = currentPrice - (atr * atrMultiplier * riskRewardRatio);
        } else {
            // Đối với HOLD, SL/TP thường không có ý nghĩa, có thể đặt bằng giá hiện tại
            stop_loss = currentPrice;
            take_profit = currentPrice;
        }

        return {
            action,
            confidence: Math.round(confidence),
            timestamp: Date.now(),
            reason: reasons.join(', ') || 'No clear signal based on current analysis.', // Fallback reason
            probability: Math.round(probability),
            strength,
            entry_price: parseFloat(currentPrice.toFixed(5)), // Làm tròn giá vào lệnh
            stop_loss: parseFloat(stop_loss.toFixed(5)), // Làm tròn SL/TP đến 5 chữ số thập phân cho Forex
            take_profit: parseFloat(take_profit.toFixed(5))
        };
    }

    // Các phương thức hỗ trợ khác (đã có từ code bạn cung cấp)
    static calculateHistoricalAccuracy(candles: ProcessedCandle[], indicators: TechnicalIndicators): number {
        let accuracy = 0.75; // Base accuracy

        if (indicators.rsi > 70 || indicators.rsi < 30) {
            accuracy += 0.1; // Higher accuracy in extreme conditions
        }
        if (Math.abs(indicators.macdHistogram) > 0.0001) { // Sử dụng ngưỡng MACD phù hợp
            accuracy += 0.05; // Better accuracy with strong MACD signals
        }

        return Math.min(accuracy, 0.95);
    }
}

// Khai báo các types ở đây hoặc trong một file types/trading.ts riêng biệt
// Đảm bảo các types này khớp với định nghĩa trong Project -> Source -> types -> trading.ts của bạn
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
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    rsi: number;
    atr: number; // Đảm bảo ATR được thêm vào
    volume: number; // Current candle's volume
    avgVolume: number; // Average volume
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'UNDEFINED';
    momentum: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' | 'UNDEFINED';
}

export type Trend = 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'UNDEFINED';
export type Momentum = 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' | 'UNDEFINED';


export interface TradingSignal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number; // 0-100%
    timestamp: number;
    reason: string;
    probability: number; // 0-100%, có thể trùng với confidence
    strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    entry_price: number;
    stop_loss: number;
    take_profit: number;
}

export interface MarketAnalysis {
    trend: Trend;
    momentum: Momentum;
    volatility: 'HIGH' | 'MEDIUM' | 'LOW'; // Thêm volatility
    signals: TradingSignal[];
}