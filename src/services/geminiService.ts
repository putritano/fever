import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProcessedCandle, TechnicalIndicators, TradingSignal } from '../types/trading';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI('AIzaSyDmML_8kM32pAy6Rr6WOwbbO8W-S5j_5Go');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async enhanceAnalysis(
    candles: ProcessedCandle[],
    indicators: TechnicalIndicators,
    currentSignal: TradingSignal
  ): Promise<TradingSignal> {
    try {
      console.log(`🤖 Gemini AI analyzing ${currentSignal.action} signal...`);
      const marketData = this.prepareMarketData(candles, indicators, currentSignal);
      const prompt = this.createAnalysisPrompt(marketData);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiAnalysis = response.text();
      
      const enhancedSignal = this.parseAIResponse(aiAnalysis, currentSignal, candles[candles.length - 1].close);
      console.log(`✅ AI confirmed ${enhancedSignal.action} with ${enhancedSignal.confidence}% confidence`);
      return enhancedSignal;
    } catch (error) {
      console.error('Gemini AI analysis failed:', error);
      // Return original signal if AI fails
      return currentSignal;
    }
  }

  private prepareMarketData(
    candles: ProcessedCandle[],
    indicators: TechnicalIndicators,
    signal: TradingSignal
  ) {
    const recent = candles.slice(-20);
    const currentPrice = candles[candles.length - 1].close;
    const priceChange24h = ((currentPrice - candles[candles.length - 1440]?.close || currentPrice) / (candles[candles.length - 1440]?.close || currentPrice)) * 100;
    
    return {
      currentPrice,
      priceChange24h,
      volume: recent[recent.length - 1].volume,
      avgVolume: recent.reduce((sum, c) => sum + c.volume, 0) / recent.length,
      recentPrices: recent.map(c => c.close),
      recentHighs: recent.map(c => c.high),
      recentLows: recent.map(c => c.low),
      indicators,
      currentSignal: signal,
      marketCap: 'Large Cap', // Bitcoin is always large cap
      volatility: this.calculateVolatility(recent)
    };
  }

  private calculateVolatility(candles: ProcessedCandle[]): number {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const ret = Math.log(candles[i].close / candles[i - 1].close);
      returns.push(ret);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100;
  }

  private createAnalysisPrompt(data: any): string {
    return `
Bạn là một chuyên gia phân tích giao dịch Bitcoin. Dựa trên dữ liệu thị trường sau, hãy đưa ra một tín hiệu giao dịch chính xác.

THÔNG TIN THỊ TRƯỜNG:
- Giá hiện tại: $${data.currentPrice.toFixed(2)}
- Thay đổi 24h: ${data.priceChange24h.toFixed(2)}%
- Volume hiện tại: ${data.volume.toFixed(0)}
- Volume trung bình: ${data.avgVolume.toFixed(0)}
- Độ biến động: ${data.volatility.toFixed(2)}%

CHỈ SỐ KỸ THUẬT:
- RSI: ${data.indicators.rsi.toFixed(1)}
- MACD: ${data.indicators.macd.toFixed(4)}
- MACD Signal: ${data.indicators.macdSignal.toFixed(4)}
- SMA20: $${data.indicators.sma20.toFixed(2)}
- SMA50: $${data.indicators.sma50.toFixed(2)}
- EMA12: $${data.indicators.ema12.toFixed(2)}
- EMA26: $${data.indicators.ema26.toFixed(2)}

TÍN HIỆU HIỆN TẠI TỪ PHÂN TÍCH KỸ THUẬT:
- Hành động: ${data.currentSignal.action}
- Độ tin cậy: ${data.currentSignal.confidence}%
- Xác suất thắng: ${data.currentSignal.probability}%
- Độ mạnh: ${data.currentSignal.strength}

GIÁ GẦN ĐÂY (5 tick cuối): ${data.recentPrices.slice(-5).map((p: number) => p.toFixed(2)).join(', ')}

YÊU CẦU PHẢN HỒI (CHỈ JSON):
Hãy cung cấp một đối tượng JSON chứa các trường sau để cập nhật tín hiệu giao dịch. KHÔNG bao gồm bất kỳ giải thích dài dòng hay phân tích thị trường tổng thể nào khác.

ĐỊNH DẠNG PHẢN HỒI JSON:
{
  "action": "BUY|SELL|HOLD",
  "confidence": số_từ_0_đến_100,
  "probability": số_từ_0_đến_100,
  "strength": "WEAK|MODERATE|STRONG|VERY_STRONG",
  "entry_price": giá_vào_lệnh,
  "stop_loss": giá_cắt_lỗ,
  "take_profit": giá_chốt_lời,
  "reason": "Một lý do ngắn gọn (tối đa 10 từ)"
}
    `.trim();
  }

  private parseAIResponse(aiResponse: string, fallbackSignal: TradingSignal, currentPrice: number): TradingSignal {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const aiAnalysis = JSON.parse(jsonMatch[0]);
      
      return {
        action: aiAnalysis.action || fallbackSignal.action,
        confidence: Math.min(Math.max(aiAnalysis.confidence || fallbackSignal.confidence, 0), 100),
        timestamp: Date.now(),
        reason: aiAnalysis.reason ? `🤖 AI: ${aiAnalysis.reason}` : fallbackSignal.reason,
        probability: Math.min(Math.max(aiAnalysis.probability || fallbackSignal.probability, 0), 100),
        strength: aiAnalysis.strength || fallbackSignal.strength,
        entry_price: aiAnalysis.entry_price || currentPrice,
        stop_loss: aiAnalysis.stop_loss || fallbackSignal.stop_loss,
        take_profit: aiAnalysis.take_profit || fallbackSignal.take_profit
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return enhanced fallback signal
      return {
        ...fallbackSignal,
        reason: `🤖 AI Analysis Error, using technical analysis: ${fallbackSignal.reason}`,
        confidence: Math.min(fallbackSignal.confidence + 5, 95), // Slight boost for attempting AI
      };
    }
  }

  async getMarketSentiment(): Promise<string> {
    try {
      const prompt = `
Phân tích tâm lý thị trường Bitcoin hiện tại dựa trên:
- Tin tức gần đây
- Xu hướng thị trường crypto
- Các yếu tố kinh tế vĩ mô
- Hoạt động của các nhà đầu tư lớn

Trả về một trong các giá trị: EXTREMELY_BULLISH, BULLISH, NEUTRAL, BEARISH, EXTREMELY_BEARISH
Kèm theo giải thích ngắn gọn bằng tiếng Việt.

Định dạng: SENTIMENT|Giải thích
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Failed to get market sentiment:', error);
      return 'NEUTRAL|Không thể phân tích tâm lý thị trường';
    }
  }
}