import { TradingSignal, TelegramConfig } from '../types/trading';

export class TelegramService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  async sendTradingAlert(signal: TradingSignal, currentPrice: number): Promise<boolean> {
    console.log('📱 TelegramService.sendTradingAlert called:', {
      enabled: this.config.enabled,
      hasToken: !!this.config.botToken,
      hasChatId: !!this.config.chatId,
      signal: signal.action,
      strength: signal.strength,
      probability: signal.probability
    });

    if (!this.config.enabled) {
      console.log('❌ Telegram not enabled');
      return false;
    }

    if (!this.config.botToken || !this.config.chatId) {
      console.log('❌ Missing bot token or chat ID');
      return false;
    }

    // Remove the duplicate filtering here since it's already done in App.tsx
    console.log('✅ All conditions met, sending message...');

    const message = this.formatTradingMessage(signal, currentPrice);
    console.log('📝 Message formatted:', message.substring(0, 100) + '...');
    
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

      const responseData = await response.json();
      console.log('📡 Telegram API response:', {
        ok: response.ok,
        status: response.status,
        data: responseData
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  private formatTradingMessage(signal: TradingSignal, currentPrice: number): string {
    const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
    const strengthEmoji = signal.strength === 'VERY_STRONG' ? '🚀🚀' : '🚀';
    
    return `
${emoji} <b>EUR/USD TRADING SIGNAL</b> ${strengthEmoji}

<b>Action:</b> ${signal.action}
<b>Strength:</b> ${signal.strength}
<b>Confidence:</b> ${signal.confidence}%
<b>Win Probability:</b> ${signal.probability}%

<b>Entry Price:</b> $${signal.entry_price.toFixed(5)}
<b>Stop Loss:</b> $${signal.stop_loss.toFixed(5)}
<b>Take Profit:</b> $${signal.take_profit.toFixed(5)}


<b>Risk/Reward:</b> ${this.calculateRiskReward(signal)}

⚠️ <i>Lương của mày 500k/ngày thôi.</i>

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