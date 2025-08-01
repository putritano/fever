import { ProcessedCandle, TechnicalIndicators, TradingSignal, MarketAnalysis, TradingSymbol } from '../types/trading';
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

        // Adjusted thresholds for more sensitivity
        const macdHistThresholdStrong = 0.00005; // Giảm từ 0.00008
        const macdHistThresholdWeak = 0.00001; // Giảm từ 0.00003

        if (macdData.histogram > macdHistThresholdStrong && priceChange > 0) {
            momentum = 'STRONG_UP';
        } else if (macdData.histogram > macdHistThresholdWeak) {
            momentum = 'UP';
        } else if (macdData.histogram < -macdHistThresholdStrong && priceChange < 0) {
            momentum = 'STRONG_DOWN';
        } else if (macdData.histogram < -macdHistThresholdWeak) {
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
        // Adjust volatility thresholds for more sensitivity
        if (volatility > 0.005) volatilityLevel = 'HIGH'; // Giảm từ 0.01
        else if (volatility < 0.001) volatilityLevel = 'LOW'; // Giảm từ 0.002

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
        momentum: string,
        symbol?: TradingSymbol
    ): TradingSignal[] {
        // Analyze current tick for immediate action
        const signal = this.calculateCurrentTickSignal(candles, indicators, currentPrice, trend, momentum, symbol);

        return [signal];
    }

    // Phương thức để gọi AI Enhancement (đã tích hợp GeminiService)
    static async generateEnhancedTradingSignals(
        candles: ProcessedCandle[],
        indicators: TechnicalIndicators,
        trend: string,
        momentum: string,
        symbol?: TradingSymbol
    ): Promise<TradingSignal[]> {
        const currentPrice = candles[candles.length - 1].close;

        // Get basic technical analysis signal
        const basicSignal = this.calculateCurrentTickSignal(candles, indicators, currentPrice, trend, momentum, symbol);

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

    // Phương thức tính toán tín hiệu cho một tick/nến cụ thể (đã điều chỉnh độ chắc chắn cho EURUSDT)
    static calculateCurrentTickSignal(
        candles: ProcessedCandle[], // Cần truyền toàn bộ candles để tính toán ATR và Volume
        indicators: TechnicalIndicators,
        currentPrice: number,
        trend: string,
        momentum: string,
        symbol?: TradingSymbol
    ): TradingSignal {
        let score = 0;
        let reasons: string[] = [];

        // Adjust thresholds based on symbol category
        const isForex = symbol?.category === 'FOREX';
        const isCrypto = symbol?.category === 'CRYPTO';
        
        // Dynamic thresholds based on symbol type
        // Giảm các ngưỡng này để nhạy hơn
        const macdThreshold = isForex ? 0.00005 : (isCrypto ? 0.05 : 0.0005); // Giảm ngưỡng cho FOREX
        const volumeMultiplier = isForex ? 2.0 : (isCrypto ? 1.8 : 1.5); // Giảm ngưỡng cho FOREX
        // 1. RSI (Relative Strength Index) - Điều chỉnh ngưỡng cho nhạy hơn
        if (indicators.rsi < 35) { // Ngưỡng quá bán sâu (nhạy hơn)
            score += 3;
            reasons.push('RSI oversold (buy signal)');
        } else if (indicators.rsi < 45) { // Ngưỡng gần quá bán (nhạy hơn)
            score += 1;
            reasons.push('RSI approaching oversold');
        }

        if (indicators.rsi > 65) { // Ngưỡng quá mua sâu (nhạy hơn)
            score -= 3;
            reasons.push('RSI overbought (sell signal)');
        } else if (indicators.rsi > 55) { // Ngưỡng gần quá mua (nhạy hơn)
            score -= 1;
            reasons.push('RSI approaching overbought');
        }

        // 2. MACD (Moving Average Convergence Divergence) - Điều chỉnh ngưỡng histogram cho nhạy hơn

        if (indicators.macdHistogram > macdThreshold && indicators.macd > indicators.macdSignal) {
            score += 2; // MACD Bullish crossover with significant positive histogram
            reasons.push('MACD bullish crossover with strong momentum');
        } else if (indicators.macdHistogram > macdThreshold * 0.5) { // Ngưỡng nhỏ hơn để thêm điểm cho động lượng dương
            score += 1;
            reasons.push('MACD histogram positive');
        }

        if (indicators.macdHistogram < -macdThreshold && indicators.macd < indicators.macdSignal) {
            score -= 2; // MACD Bearish crossover with significant negative histogram
            reasons.push('MACD bearish crossover with strong momentum');
        } else if (indicators.macdHistogram < -macdThreshold * 0.5) { // Ngưỡng nhỏ hơn để trừ điểm cho động lượng âm
            score -= 1;
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

        // 5. Volume analysis - Yêu cầu khối lượng đột biến nhỏ hơn để xác nhận
        const currentVolume = candles[candles.length - 1].volume;
        const avgVolume = indicators.avgVolume > 0 ? indicators.avgVolume :
                          (candles.length >= 20 ? candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20 : 1);
        
        if (currentVolume > avgVolume * volumeMultiplier) { // Dynamic volume multiplier based on symbol
             score += Math.sign(score) * 1; // Khuếch đại tín hiệu hiện có (nếu có)
             reasons.push('High volume confirmation');
        }


        // 6. Volatility (có thể ảnh hưởng đến confidence, nhưng không trực tiếp thêm/bớt score ở đây)

        // Xác định action và strength dựa trên score (đã điều chỉnh để nhạy hơn)
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;
        let probability = 50;
        let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';

        if (score >= 4) { // MODERATE BUY (giảm từ 6)
            action = 'BUY';
            if (score >= 10) { // VERY_STRONG BUY (giảm từ 13)
                strength = 'VERY_STRONG';
                probability = 90;
            } else if (score >= 7) { // STRONG BUY (giảm từ 9)
                strength = 'STRONG';
                probability = 80;
            } else {
                strength = 'MODERATE';
                probability = 65;
            }
        } else if (score <= -4) { // MODERATE SELL (giảm từ -6)
            action = 'SELL';
            if (score <= -10) { // VERY_STRONG SELL
                strength = 'VERY_STRONG';
                probability = 90;
            } else if (score <= -7) { // STRONG SELL
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
        const atr = indicators.atr && !isNaN(indicators.atr) && indicators.atr > 0 ? indicators.atr : 0.00005;
        const riskRewardRatio = 1.5;
        const atrMultiplier = isForex ? 1.2 : (isCrypto ? 1.5 : 1.4); // Giảm atrMultiplier để SL/TP gần hơn

        let stop_loss = 0;
        let take_profit = 0;

        if (action === 'BUY') {
            stop_loss = currentPrice - (atr * atrMultiplier);
            take_profit = currentPrice + (atr * atrMultiplier * riskRewardRatio);
        } else if (action === 'SELL') {
            stop_loss = currentPrice + (atr * atrMultiplier);
            take_profit = currentPrice - (atr * atrMultiplier * riskRewardRatio);
        } else {
            stop_loss = currentPrice;
            take_profit = currentPrice;
        }

        // Format prices according to symbol precision
        const priceDecimals = symbol?.priceDecimals || 5;
        return {
            action,
            confidence: Math.round(confidence),
            timestamp: Date.now(),
            reason: reasons.join(', ') || 'No clear signal based on current analysis.',
            probability: Math.round(probability),
            strength,
            entry_price: parseFloat(currentPrice.toFixed(priceDecimals)),
            stop_loss: parseFloat(stop_loss.toFixed(priceDecimals)),
            take_profit: parseFloat(take_profit.toFixed(priceDecimals))
        };
    }

    // Các phương thức hỗ trợ khác (đã có từ code bạn cung cấp)
    static calculateHistoricalAccuracy(candles: ProcessedCandle[], indicators: TechnicalIndicators): number {
        let accuracy = 0.75; // Base accuracy

        if (indicators.rsi >= 65 || indicators.rsi <= 35) { // Chỉ sử dụng các giá trị RSI cực đoan để tăng độ chính xác
            accuracy += 0.1;
        }
        if (Math.abs(indicators.macdHistogram) > 0.00001) { // Sử dụng ngưỡng MACD phù hợp
            accuracy += 0.05;
        }

        return Math.min(accuracy, 0.95);
    }
}