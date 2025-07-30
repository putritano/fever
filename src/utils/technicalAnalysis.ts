import { Candle, TechnicalIndicators, TradingSignal, Trend, Momentum } from './types/trading'; // Đảm bảo đường dẫn đúng

export class TechnicalAnalyzer {

    // Phương thức để tính toán các chỉ báo kỹ thuật
    static getTechnicalIndicators(candles: Candle[]): TechnicalIndicators | null {
        if (candles.length === 0) {
            return null;
        }

        // Đảm bảo đủ dữ liệu cho các chỉ báo
        if (candles.length < 26) { // Cần ít nhất 26 nến cho EMA26
            return null;
        }
        
        const currentPrice = candles[candles.length - 1].close;
        const closes = candles.map(c => c.close);
        const highPrices = candles.map(c => c.high);
        const lowPrices = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume);

        // Tính SMA20
        const sma20 = closes.slice(-20).reduce((sum, val) => sum + val, 0) / 20;

        // Tính EMA12
        const calculateEMA = (data: number[], period: number) => {
            if (data.length < period) return NaN;
            let k = 2 / (period + 1);
            let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period; // SMA ban đầu
            for (let i = period; i < data.length; i++) {
                ema = (data[i] - ema) * k + ema;
            }
            return ema;
        };
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);

        // Tính MACD
        const macd = ema12 - ema26;
        // MACD Signal Line (EMA9 của MACD)
        const macdValues: number[] = [];
        for (let i = 25; i < closes.length; i++) { // Bắt đầu từ khi có đủ 26 nến cho EMA26
            const currentEma12 = calculateEMA(closes.slice(0, i + 1), 12);
            const currentEma26 = calculateEMA(closes.slice(0, i + 1), 26);
            if (!isNaN(currentEma12) && !isNaN(currentEma26)) {
                macdValues.push(currentEma12 - currentEma26);
            }
        }
        const macdSignal = calculateEMA(macdValues, 9);
        const macdHistogram = macd - macdSignal;


        // Tính RSI
        const calculateRSI = (data: number[], period: number) => {
            if (data.length < period + 1) return NaN; // Need at least period + 1 data points
            let gains = 0;
            let losses = 0;

            for (let i = 1; i <= period; i++) {
                let diff = data[i] - data[i - 1];
                if (diff > 0) {
                    gains += diff;
                } else {
                    losses += Math.abs(diff);
                }
            }

            let avgGain = gains / period;
            let avgLoss = losses / period;

            // Smoothed averages for subsequent periods
            for (let i = period + 1; i < data.length; i++) {
                let diff = data[i] - data[i - 1];
                if (diff > 0) {
                    avgGain = (avgGain * (period - 1) + diff) / period;
                    avgLoss = (avgLoss * (period - 1)) / period;
                } else {
                    avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
                    avgGain = (avgGain * (period - 1)) / period;
                }
            }

            if (avgLoss === 0) return 100; // No losses, RSI is 100
            if (avgGain === 0) return 0; // No gains, RSI is 0

            let rs = avgGain / avgLoss;
            return 100 - (100 / (1 + rs));
        };
        const rsi = calculateRSI(closes, 14);

        // Tính ATR (Average True Range)
        const calculateATR = (highs: number[], lows: number[], closes: number[], period: number) => {
            if (highs.length < period || lows.length < period || closes.length < period) return NaN;

            let trueRanges: number[] = [];
            for (let i = 1; i < closes.length; i++) {
                const tr = Math.max(
                    highs[i] - lows[i],
                    Math.abs(highs[i] - closes[i - 1]),
                    Math.abs(lows[i] - closes[i - 1])
                );
                trueRanges.push(tr);
            }

            if (trueRanges.length === 0) return 0; // Should not happen if closes.length > 1

            // Simple Moving Average of True Ranges for ATR
            if (trueRanges.length < period) {
                return trueRanges.reduce((sum, val) => sum + val, 0) / trueRanges.length; // Handle short period
            }
            return trueRanges.slice(-period).reduce((sum, val) => sum + val, 0) / period;
        };
        const atr = calculateATR(highPrices, lowPrices, closes, 14); // ATR(14)


        // Tính toán khối lượng trung bình
        const avgVolume = volumes.reduce((sum, val) => sum + val, 0) / volumes.length;


        // Xác định xu hướng (đơn giản dựa trên các đường trung bình động lớn hơn)
        // Đây chỉ là một phương pháp đơn giản. Có thể phức tạp hơn với các khung thời gian lớn hơn.
        let trend: Trend = 'UNDEFINED';
        if (!isNaN(ema12) && !isNaN(ema26) && !isNaN(sma20)) {
            if (ema12 > ema26 && currentPrice > sma20) { // currentPrice đã được định nghĩa ở trên
                trend = 'BULLISH';
            } else if (ema12 < ema26 && currentPrice < sma20) { // currentPrice đã được định nghĩa ở trên
                trend = 'BEARISH';
            } else {
                trend = 'SIDEWAYS';
            }
        }
        
        // Xác định động lượng (từ MACD Histogram và tốc độ thay đổi giá)
        let momentum: Momentum = 'NEUTRAL';
        if (!isNaN(macdHistogram)) {
            if (macdHistogram > 0.00005) { // Ngưỡng nhỏ hơn để nhạy hơn
                momentum = 'STRONG_UP';
            } else if (macdHistogram > 0) {
                momentum = 'UP';
            } else if (macdHistogram < -0.00005) { // Ngưỡng nhỏ hơn để nhạy hơn
                momentum = 'STRONG_DOWN';
            } else if (macdHistogram < 0) {
                momentum = 'DOWN';
            }
        }


        return {
            sma20,
            ema12,
            ema26,
            macd,
            macdSignal,
            macdHistogram,
            rsi,
            atr, // Bao gồm ATR
            volume: volumes[volumes.length - 1], // Khối lượng nến hiện tại
            avgVolume, // Khối lượng trung bình
            trend,
            momentum
        };
    }

    // Phương thức chính để phân tích thị trường và đưa ra tín hiệu
    static analyzeMarket(candles: Candle[]): MarketAnalysis {
        const currentCandle = candles[candles.length - 1];
        const indicators = TechnicalAnalyzer.getTechnicalIndicators(candles);
        const trend = indicators?.trend || 'UNDEFINED';
        const momentum = indicators?.momentum || 'NEUTRAL';

        let signals: TradingSignal[] = [];

        if (!indicators || candles.length < 26) { // Cần đủ dữ liệu để tính toán chỉ báo
            signals.push({
                action: 'HOLD',
                confidence: 50,
                timestamp: Date.now(),
                reason: 'Insufficient data for analysis.',
                probability: 50,
                strength: 'WEAK',
                entry_price: currentCandle ? currentCandle.close : 0,
                stop_loss: 0,
                take_profit: 0
            });
            return { trend, momentum, signals };
        }

        // Tạo tín hiệu dựa trên các chỉ báo
        const currentSignal = TechnicalAnalyzer.calculateCurrentTickSignal(
            currentCandle,
            indicators,
            trend,
            momentum
        );
        signals.push(currentSignal);

        // Thêm logic để sắp xếp, lọc tín hiệu nếu cần
        // (ví dụ: chỉ giữ tín hiệu mạnh nhất nếu có nhiều tín hiệu từ các chiến lược khác nhau)

        return {
            trend,
            momentum,
            signals
        };
    }

    // Phương thức tính toán tín hiệu cho một tick/nến cụ thể (đã điều chỉnh)
    static calculateCurrentTickSignal(
        candle: Candle,
        indicators: TechnicalIndicators,
        trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'UNDEFINED',
        momentum: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' | 'UNDEFINED'
    ): TradingSignal {
        let score = 0;
        const currentPrice = candle.close;

        // 1. RSI (Relative Strength Index) - Điều chỉnh ngưỡng cho EURUSDT M1
        if (indicators.rsi < 35) { // Tăng ngưỡng quá bán từ 30 lên 35
            score += 3;
        } else if (indicators.rsi < 45) { // Tăng ngưỡng gần quá bán từ 40 lên 45
            score += 1;
        }

        if (indicators.rsi > 65) { // Giảm ngưỡng quá mua từ 70 xuống 65
            score -= 3;
        } else if (indicators.rsi > 55) { // Giảm ngưỡng gần quá mua từ 60 xuống 55
            score -= 1;
        }

        // 2. MACD (Moving Average Convergence Divergence) - Điều chỉnh ngưỡng histogram
        // Giá trị cực nhỏ cho EURUSDT M1
        const macdThreshold = 0.00001; // Giảm ngưỡng để bắt các biến động nhỏ

        if (indicators.macdHistogram > macdThreshold && indicators.macd > indicators.macdSignal) {
            score += 2; // MACD Bullish crossover with positive histogram
        } else if (indicators.macdHistogram > 0) {
            score += 1; // MACD Histogram dương
        }

        if (indicators.macdHistogram < -macdThreshold && indicators.macd < indicators.macdSignal) {
            score -= 2; // MACD Bearish crossover with negative histogram
        } else if (indicators.macdHistogram < 0) {
            score -= 1; // MACD Histogram âm
        }
        
        // 3. Price vs Moving Averages
        if (currentPrice > indicators.sma20) {
            score += 2;
        } else {
            score -= 2;
        }

        // EMA Crossovers
        if (indicators.ema12 > indicators.ema26) {
            score += 2; // Bullish cross
        } else {
            score -= 2; // Bearish cross
        }

        // 4. Trend Confirmation
        if (trend === 'BULLISH') {
            score += 2;
        } else if (trend === 'BEARISH') {
            score -= 2;
        }

        // 5. Volume Analysis (Cân nhắc tác động trên M1 Forex)
        // Volume trên M1 của Forex có thể rất nhiễu. Có thể giữ hoặc loại bỏ tùy chiến lược.
        // Tôi sẽ giữ nó nhưng với ngưỡng cao hơn để chỉ phản ánh volume đột biến
        const avgVolume = indicators.avgVolume || 1; // Tránh chia cho 0
        if (candle.volume > avgVolume * 2 && score > 0) { // Yêu cầu volume gấp đôi trung bình để xác nhận
             score += 1;
        } else if (candle.volume > avgVolume * 2 && score < 0) {
             score -= 1;
        }


        // Xác định tín hiệu và cường độ
        let action: 'BUY' | 'SELL' | 'HOLD';
        let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
        let probability: number;
        let reason: string;

        // Điều chỉnh các ngưỡng điểm số để tín hiệu nhạy hơn
        if (score >= 4) { // Giảm ngưỡng từ 5 xuống 4 cho MODERATE BUY
            action = 'BUY';
            if (score >= 10) { // Tăng ngưỡng STRONG từ 8 lên 10
                strength = 'VERY_STRONG';
                probability = 90;
                reason = 'Very Strong Buy Signal based on multiple confirming indicators and strong momentum.';
            } else if (score >= 7) { // Giảm ngưỡng VERY_STRONG từ 12 xuống 7
                strength = 'STRONG';
                probability = 80;
                reason = 'Strong Buy Signal with confirming technical factors.';
            } else {
                strength = 'MODERATE';
                probability = 65;
                reason = 'Moderate Buy Signal with some confirming indicators.';
            }
        } else if (score <= -4) { // Giảm ngưỡng từ -5 xuống -4 cho MODERATE SELL
            action = 'SELL';
            if (score <= -10) { // Giảm ngưỡng STRONG từ -8 xuống -10
                strength = 'VERY_STRONG';
                probability = 90;
                reason = 'Very Strong Sell Signal based on multiple confirming indicators and strong momentum.';
            } else if (score <= -7) { // Giảm ngưỡng VERY_STRONG từ -12 xuống -7
                strength = 'STRONG';
                probability = 80;
                reason = 'Strong Sell Signal with confirming technical factors.';
            } else {
                strength = 'MODERATE';
                probability = 65;
                reason = 'Moderate Sell Signal with some confirming indicators.';
            }
        } else {
            action = 'HOLD';
            strength = 'WEAK';
            probability = 50;
            reason = 'Market is consolidating or lacking clear direction.';
        }

        // Tính toán Stop Loss và Take Profit dựa trên ATR hoặc phần trăm nhỏ hơn cho EURUSDT M1
        const riskRewardRatio = 1.5; // Tỷ lệ R:R mong muốn (ví dụ 1:1.5)
        const atrMultiplier = 1.5; // Dùng 1.5 lần ATR cho SL/TP
        
        let stop_loss = 0;
        let take_profit = 0;

        if (indicators.atr && !isNaN(indicators.atr) && indicators.atr > 0) {
            const sl_tp_range = indicators.atr * atrMultiplier;
            if (action === 'BUY') {
                stop_loss = currentPrice - sl_tp_range;
                take_profit = currentPrice + (sl_tp_range * riskRewardRatio);
            } else if (action === 'SELL') {
                stop_loss = currentPrice + sl_tp_range;
                take_profit = currentPrice - (sl_tp_range * riskRewardRatio);
            }
        } else {
            // Fallback nếu không có ATR hoặc ATR = 0, sử dụng phần trăm rất nhỏ cho EURUSDT M1
            // Đây là một giá trị ước tính, cần điều chỉnh dựa trên quan sát thực tế của bạn
            const percentage_range = 0.0002; // Ví dụ 0.02% của giá (0.0002 cho 1.0000)
            if (action === 'BUY') {
                stop_loss = currentPrice * (1 - percentage_range);
                take_profit = currentPrice * (1 + (percentage_range * riskRewardRatio));
            } else if (action === 'SELL') {
                stop_loss = currentPrice * (1 + percentage_range);
                take_profit = currentPrice * (1 - (percentage_range * riskRewardRatio));
            }
        }

        return {
            action,
            confidence: probability,
            timestamp: Date.now(),
            reason,
            probability,
            strength,
            entry_price: parseFloat(currentPrice.toFixed(5)), // Làm tròn giá vào lệnh
            stop_loss: parseFloat(stop_loss.toFixed(5)), // Làm tròn đến 5 chữ số thập phân cho Forex
            take_profit: parseFloat(take_profit.toFixed(5)) // Làm tròn đến 5 chữ số thập phân cho Forex
        };
    }

    // Phương thức để gọi AI Enhancement (ví dụ)
    static async generateEnhancedTradingSignals(
        candles: Candle[],
        indicators: TechnicalIndicators,
        trend: Trend,
        momentum: Momentum
    ): Promise<TradingSignal[]> {
        // Đây là nơi bạn sẽ gọi API Gemini
        // Logic này có thể phức tạp hơn, tùy thuộc vào cách bạn muốn AI phân tích
        // Ví dụ: gửi tất cả dữ liệu nến, chỉ báo, xu hướng, động lượng cho AI
        // và nhận lại các tín hiệu được AI xác nhận hoặc điều chỉnh.

        // GIẢ ĐỊNH: Gọi một dịch vụ Gemini (ví dụ: thông qua một API khác hoặc trực tiếp)
        // Trong thực tế, bạn sẽ có một lớp hoặc hàm để tương tác với Gemini API.
        // Ví dụ đơn giản:
        const currentCandle = candles[candles.length - 1];
        const currentSignal = TechnicalAnalyzer.calculateCurrentTickSignal(
            currentCandle,
            indicators,
            trend,
            momentum
        );

        // Mô phỏng cuộc gọi API Gemini và phản hồi
        return new Promise(resolve => {
            setTimeout(() => { // Mô phỏng độ trễ API
                let aiConfidence = currentSignal.confidence;
                let aiAction = currentSignal.action;
                let aiReason = currentSignal.reason;

                // Simple AI logic: If TA signal is MODERATE, AI might confirm or contradict
                // If TA is STRONG/VERY_STRONG, AI might just add confidence
                if (currentSignal.strength === 'MODERATE') {
                    // Example: AI might boost confidence or change action based on internal model
                    // For demonstration, let's say AI confirms with higher confidence
                    aiConfidence += 10;
                    aiConfidence = Math.min(aiConfidence, 95); // Max 95%
                    aiReason = `AI confirmed ${currentSignal.action} signal with increased confidence.`;
                } else if (currentSignal.strength === 'WEAK') {
                    // AI might still say HOLD or even contradict if it sees no opportunity
                    aiAction = 'HOLD';
                    aiConfidence = 50;
                    aiReason = 'AI suggests HOLD due to lack of strong conviction, despite technical analysis.';
                } else {
                     // Strong signals, AI likely confirms or slightly adjusts confidence
                     aiConfidence += 5; // Boost confidence for strong signals
                     aiConfidence = Math.min(aiConfidence, 98);
                     aiReason = `AI strongly confirms ${currentSignal.action} signal.`;
                }
                
                // You can add more sophisticated AI logic here, e.g.,
                // based on a more detailed prompt sent to Gemini with all indicators and context.

                const enhancedSignal: TradingSignal = {
                    ...currentSignal,
                    action: aiAction,
                    confidence: aiConfidence,
                    probability: aiConfidence, // For simplicity, probability = confidence
                    reason: aiReason,
                    strength: aiConfidence >= 85 ? 'VERY_STRONG' : (aiConfidence >= 75 ? 'STRONG' : 'MODERATE') // Re-evaluate strength based on AI confidence
                };
                resolve([enhancedSignal]);
            }, 1000); // 1 giây giả lập thời gian phản hồi của AI
        });
    }
}

// Khai báo các types ở đây hoặc trong một file types/trading.ts riêng biệt
// Nếu bạn đã có file types/trading.ts, hãy đảm bảo chúng khớp

export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface TechnicalIndicators {
    sma20: number;
    ema12: number;
    ema26: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    rsi: number;
    atr: number; // Thêm ATR vào đây
    volume: number;
    avgVolume: number;
    trend: Trend;
    momentum: Momentum;
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
    signals: TradingSignal[];
}