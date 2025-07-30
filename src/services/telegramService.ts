import { TradingSignal, TelegramConfig } from '../types/trading';

export class TelegramService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  async sendTradingAlert(signal: TradingSignal, currentPrice: number): Promise<boolean> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return false;
    }

    // Only send alerts for strong signals with high win probability
    if ((signal.strength !== 'STRONG' && signal.strength !== 'VERY_STRONG') || signal.probability < 75) {
      return false;
    }

    const message = this.formatTradingMessage(signal, currentPrice);
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  private formatTradingMessage(signal: TradingSignal, currentPrice: number): string {
    const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
    const strengthEmoji = '🚀'; // Combined strong signal emoji
    
    return `
${emoji} <b>BITCOIN TRADING SIGNAL</b> ${strengthEmoji}

<b>Action:</b> ${signal.action}
<b>Strength:</b> STRONG
<b>Confidence:</b> ${signal.confidence}%
<b>Win Probability:</b> ${signal.probability}%

<b>Entry Price:</b> $${signal.entry_price.toFixed(2)}
<b>Stop Loss:</b> $${signal.stop_loss.toFixed(2)}
<b>Take Profit:</b> $${signal.take_profit.toFixed(2)}


<b>Risk/Reward:</b> ${this.calculateRiskReward(signal)}

⚠️ <i></i>

<b>Time:</b> ${new Date(signal.timestamp).toLocaleString('vi-VN')}
    `.trim();
  }

  private calculateRiskReward(signal: TradingSignal): string {
    const risk = Math.abs(signal.entry_price - signal.stop_loss);
    const reward = Math.abs(signal.take_profit - signal.entry_price);
    const ratio = (reward / risk).toFixed(2);
    return `1:${ratio}`;
  }

  updateConfig(config: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...config };
  }
}