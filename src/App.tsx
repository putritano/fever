import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useBinanceData } from './hooks/useBinanceData';
import { TechnicalAnalyzer } from './utils/technicalAnalysis';
import { PriceChart } from './components/PriceChart';
import { TradingSignals } from './components/TradingSignals';
import { MarketOverview } from './components/MarketOverview';
import { TelegramSettings } from './components/TelegramSettings';
import { TelegramService } from './services/telegramService';
import { TelegramConfig, TradingSignal } from './types/trading';
import { RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

function App() {
  const { candles, loading, error, lastUpdate, isConnected, refetch } = useBinanceData(5000); // 5 second updates
  
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: localStorage.getItem('telegram_bot_token') || '',
    chatId: localStorage.getItem('telegram_chat_id') || '',
    enabled: localStorage.getItem('telegram_enabled') === 'true'
  });
  
  const [telegramService] = useState(() => new TelegramService(telegramConfig));
  const [lastSignalSent, setLastSignalSent] = useState<number>(0);

  const analysis = useMemo(() => {
    if (candles.length === 0) return null;
    return TechnicalAnalyzer.analyzeMarket(candles);
  }, [candles]);

  // Enhanced analysis with AI
  const [enhancedAnalysis, setEnhancedAnalysis] = useState(analysis);

  useEffect(() => {
    setEnhancedAnalysis(analysis); // Update enhancedAnalysis when basic analysis changes
    if (candles.length > 0 && analysis) {
      const lastCandleTime = candles[candles.length - 1].openTime;
      // Trigger AI enhancement only if it's a new candle and not just a refetch of existing data
      // Add a debounce or throttle if necessary for frequent updates
      if (lastCandleTime !== lastSignalSent && analysis.signals.length > 0) {
        const latestSignal = analysis.signals[analysis.signals.length - 1];
        if (latestSignal.action !== 'HOLD') { // Only enhance BUY/SELL signals
          console.log("Triggering AI enhancement for signal:", latestSignal.action);
          TechnicalAnalyzer.generateEnhancedTradingSignals(candles, analysis.indicators, analysis.trend, analysis.momentum)
            .then(signals => {
              if (signals.length > 0) {
                setEnhancedAnalysis(prev => ({
                  ...prev!, // 'prev!' because we know analysis is not null here
                  signals: signals
                }));
                setLastSignalSent(lastCandleTime); // Mark this candle's time as processed for AI
                
                // Send Telegram alert for the enhanced signal
                if (telegramConfig.enabled) {
                  const currentPrice = candles[candles.length - 1].close;
                  telegramService.sendTradingAlert(signals[0], currentPrice);
                }
              }
            })
            .catch(err => {
              console.error("Error enhancing signal with AI:", err);
              // Fallback to basic analysis signal if AI fails
              if (analysis.signals.length > 0) {
                setEnhancedAnalysis(prev => ({
                  ...prev!,
                  signals: [analysis.signals[analysis.signals.length - 1]]
                }));
              }
            });
        }
      }
    }
  }, [candles, analysis, telegramConfig.enabled, telegramService, lastSignalSent]); // Add lastSignalSent to dependency array

  // Update telegramService config if it changes
  useEffect(() => {
    telegramService.updateConfig(telegramConfig);
  }, [telegramConfig, telegramService]);


  const handleTelegramConfigChange = useCallback((newConfig: TelegramConfig) => {
    setTelegramConfig(newConfig);
    localStorage.setItem('telegram_bot_token', newConfig.botToken);
    localStorage.setItem('telegram_chat_id', newConfig.chatId);
    localStorage.setItem('telegram_enabled', String(newConfig.enabled));
  }, []);

  const handleTestMessage = useCallback(async () => {
    const testSignal: TradingSignal = {
      action: 'BUY',
      confidence: 85,
      timestamp: Date.now(),
      probability: 75,
      strength: 'VERY_STRONG',
      entry_price: candles[candles.length - 1]?.close || 0,
      stop_loss: (candles[candles.length - 1]?.close || 0) * 0.98,
      take_profit: (candles[candles.length - 1]?.close || 0) * 1.05,
    };
    const success = await telegramService.sendTradingAlert(testSignal, testSignal.entry_price);
    alert(success ? 'Test message sent!' : 'Failed to send test message.');
  }, [telegramService, candles]);

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const previousPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousPrice;

  const displayAnalysis = enhancedAnalysis || analysis;
  const indicators = displayAnalysis?.indicators;


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
        <RefreshCw className="w-8 h-8 animate-spin mr-3" />
        <p>Loading market data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900/20 text-red-400">
        <AlertTriangle className="w-8 h-8 mr-3" />
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!displayAnalysis || !indicators) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
        <p>No analysis available. Please wait for data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
        <h1 className="text-3xl font-bold text-blue-400">Bitcoin AI Trading Bot</h1>
        <div className="flex items-center space-x-4">
          <span className={`flex items-center text-sm font-medium ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? <Wifi className="w-5 h-5 mr-1" /> : <WifiOff className="w-5 h-5 mr-1" />}
            {isConnected ? 'Online' : 'Offline'}
          </span>
          <span className="text-sm text-gray-400">Last Update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'}</span>
          <button
            onClick={refetch}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart */}
          <div className="lg:col-span-2">
            <PriceChart candles={candles.slice(-100)} width={800} height={400} />
          </div>

          {/* Right Column - Market Overview */}
          <div>
            <MarketOverview
              analysis={displayAnalysis}
              indicators={indicators}
              currentPrice={currentPrice}
              priceChange={priceChange}
            />
          </div>
        </div>

        {/* Trading Signals */}
        <div className="mt-6">
          <TradingSignals signals={displayAnalysis.signals} />
        </div>

        {/* Telegram Settings */}
        <div className="mt-6">
          <TelegramSettings 
            config={telegramConfig}
            onConfigChange={handleTelegramConfigChange}
            onTestMessage={handleTestMessage}
          />
        </div>

        {/* Risk Warning */}
        <div className="mt-6 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-400 font-semibold mb-2">Risk Warning</h3>
              <p className="text-yellow-100 text-sm leading-relaxed">
                Đừng tham lam. Lương của mày chỉ được 500 cành / ngày
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;