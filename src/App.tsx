import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useBinanceData } from './hooks/useBinanceData';
import { TechnicalAnalyzer } from './utils/technicalAnalysis';
import { PriceChart } from './components/PriceChart';
import { TradingSignals } from './components/TradingSignals';
import { MarketOverview } from './components/MarketOverview';
import { TelegramSettings } from './components/TelegramSettings';
import { SymbolSelector } from './components/SymbolSelector';
import { TelegramService } from './services/telegramService';
import { TelegramConfig, TradingSignal, MarketAnalysis, TradingSymbol } from './types/trading';
import { DEFAULT_SYMBOL } from './config/symbols';
import { RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

function App() {
  // Symbol state
  const [currentSymbol, setCurrentSymbol] = useState<TradingSymbol>(() => {
    const savedSymbol = localStorage.getItem('selected_symbol');
    if (savedSymbol) {
      try {
        return JSON.parse(savedSymbol);
      } catch {
        return DEFAULT_SYMBOL;
      }
    }
    return DEFAULT_SYMBOL;
  });

  const { candles, loading, error, lastUpdate, isConnected, refetch } = useBinanceData(5000, currentSymbol); // 5 second updates

  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: localStorage.getItem('telegram_bot_token') || '',
    chatId: localStorage.getItem('telegram_chat_id') || '',
    enabled: localStorage.getItem('telegram_enabled') === 'true'
  });

  const [telegramService] = useState(() => new TelegramService(telegramConfig));
  const [lastSignalSent, setLastSignalSent] = useState<number>(0);

  // Handle symbol change
  const handleSymbolChange = useCallback((symbol: TradingSymbol) => {
    setCurrentSymbol(symbol);
    localStorage.setItem('selected_symbol', JSON.stringify(symbol));
    // Reset analysis states when symbol changes
    setBaseAnalysis(null);
    setEnhancedAnalysis(null);
    setAnalysisConflict(false);
  }, []);
  // baseAnalysis will hold the result of TechnicalAnalyzer.analyzeMarket
  const [baseAnalysis, setBaseAnalysis] = useState<MarketAnalysis | null>(null);

  // Update baseAnalysis whenever candles change
  useEffect(() => {
    if (candles.length === 0) {
      setBaseAnalysis(null);
      return;
    }
    setBaseAnalysis(TechnicalAnalyzer.analyzeMarket(candles));
  }, [candles]);

  // Enhanced analysis with AI
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<MarketAnalysis | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [lastAiCall, setLastAiCall] = useState<number>(0);
  const [analysisConflict, setAnalysisConflict] = useState<{ ta: string; ai: string } | false>(false);


  // Get AI-enhanced analysis only for BUY/SELL signals
  useEffect(() => {
    // Reset analysis conflict state when base analysis changes
    setAnalysisConflict(false);

    if (!baseAnalysis || candles.length === 0) {
      setEnhancedAnalysis(null); // Ensure enhancedAnalysis is null if no base analysis
      return;
    }

    // --- START MODIFICATION ---
    const currentSignal = baseAnalysis.signals[0];
    const isActionableAndStrongSignal = currentSignal &&
      (currentSignal.action === 'BUY' || currentSignal.action === 'SELL') &&
      (currentSignal.strength === 'STRONG' || currentSignal.strength === 'VERY_STRONG');

    // Only call AI if we have an actionable AND STRONG signal and haven't called recently (6 second cooldown)
    const timeSinceLastAI = Date.now() - lastAiCall;
    const shouldCallAI = isActionableAndStrongSignal && timeSinceLastAI > 1000; // 6 seconds cooldown
    // --- END MODIFICATION ---

    if (!shouldCallAI) {
      // If AI shouldn't be called, use the basic analysis
      setEnhancedAnalysis(baseAnalysis);
      return;
    }

    const enhanceWithAI = async () => {
      setAiProcessing(true);
      setLastAiCall(Date.now());

      try {
        console.log(`🤖 Calling Gemini AI for ${currentSignal.action} signal confirmation (Strength: ${currentSignal.strength})`); // Added strength for logging
        const indicators = TechnicalAnalyzer.getTechnicalIndicators(candles);
        const enhancedSignals = await TechnicalAnalyzer.generateEnhancedTradingSignals(
          candles,
          indicators,
          baseAnalysis.trend,
          baseAnalysis.momentum,
          currentSymbol
        );

        const finalAnalysis = {
          ...baseAnalysis,
          signals: enhancedSignals
        };
        setEnhancedAnalysis(finalAnalysis);

        // Logic to detect conflict
        const taAction = baseAnalysis.signals[0]?.action;
        const aiAction = finalAnalysis.signals[0]?.action;

        if (taAction && aiAction && taAction !== aiAction) {
          setAnalysisConflict({ ta: taAction, ai: aiAction });
        }

        console.log('✅ AI enhancement completed successfully');
      } catch (error) {
        console.error('AI enhancement failed:', error);
        setEnhancedAnalysis(baseAnalysis); // Fallback to basic analysis if AI fails
      } finally {
        setAiProcessing(false);
      }
    };

    enhanceWithAI();
  }, [baseAnalysis, candles, lastAiCall, currentSymbol]); // Depend on baseAnalysis and currentSymbol

  const indicators = useMemo(() => {
    if (candles.length === 0) return null;
    return TechnicalAnalyzer.getTechnicalIndicators(candles);
  }, [candles]);

  const priceChange = useMemo(() => {
    if (candles.length < 2) return 0;
    const current = candles[candles.length - 1].close;
    const previous = candles[candles.length - 2].close;
    return ((current - previous) / previous) * 100;
  }, [candles]);

  // Handle Telegram config changes
  const handleTelegramConfigChange = useCallback((config: TelegramConfig) => {
    setTelegramConfig(config);
    telegramService.updateConfig(config);

    // Save to localStorage
    localStorage.setItem('telegram_bot_token', config.botToken);
    localStorage.setItem('telegram_chat_id', config.chatId);
    localStorage.setItem('telegram_enabled', config.enabled.toString());
  }, [telegramService]);

  // Send test message
  const handleTestMessage = useCallback(async () => {
    const testSignal: TradingSignal = {
      action: 'BUY',
      confidence: 85,
      timestamp: Date.now(),
      reason: `Test message from ${currentSymbol.displayName} Trading Analyzer`,
      probability: 75,
      strength: 'STRONG',
      entry_price: candles.length > 0 ? candles[candles.length - 1].close : 50000,
      stop_loss: candles.length > 0 ? candles[candles.length - 1].close * 0.98 : 49000,
      take_profit: candles.length > 0 ? candles[candles.length - 1].close * 1.02 : 51000
    };

    const success = await telegramService.sendTradingAlert(testSignal, testSignal.entry_price);
    if (success) {
      alert('Test message sent successfully!');
    } else {
      alert('Failed to send test message. Please check your configuration.');
    }
  }, [telegramService, candles, currentSymbol]);

  // Auto-send strong signals
  useEffect(() => {
    if (!enhancedAnalysis || !telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
      console.log('❌ Telegram auto-send skipped:', {
        hasAnalysis: !!enhancedAnalysis,
        enabled: telegramConfig.enabled,
        hasToken: !!telegramConfig.botToken,
        hasChatId: !!telegramConfig.chatId
      });
      return;
    }

    const currentSignal = enhancedAnalysis.signals[0];
    if (!currentSignal) {
      console.log('❌ No signal found for auto-send');
      return;
    }

    // Only send if it's a strong signal and we haven't sent one recently (prevent spam)
    const timeSinceLastSignal = Date.now() - lastSignalSent;
    const isStrongSignal = (currentSignal.strength === 'STRONG' || currentSignal.strength === 'VERY_STRONG');
    const isHighProbability = currentSignal.probability >= 75;
    const isActionable = (currentSignal.action === 'BUY' || currentSignal.action === 'SELL');
    const cooldownPassed = timeSinceLastSignal > 60000; // 1 minute cooldown
    
    const shouldSend = isStrongSignal &&
      isHighProbability &&
      isActionable &&
      cooldownPassed;

    console.log('🔍 Telegram auto-send check:', {
      signal: currentSignal.action,
      strength: currentSignal.strength,
      currentSignal.probability >= 75 &&
      probability: currentSignal.probability,
      isStrongSignal,
      isHighProbability,
      isActionable,
      cooldownPassed,
      timeSinceLastSignal: Math.round(timeSinceLastSignal / 1000) + 's',
      shouldSend
    });

    if (shouldSend) {
      console.log('📤 Sending Telegram alert...');
      const currentPrice = candles[candles.length - 1].close;
      telegramService.sendTradingAlert(currentSignal, currentPrice).then(success => {
        if (success) {
          setLastSignalSent(Date.now());
          console.log('✅ Trading signal sent to Telegram successfully');
        } else {
          console.log('❌ Failed to send trading signal to Telegram');
        }
      });
    } else {
      console.log('⏸️ Signal not sent - conditions not met');
    }
  }, [enhancedAnalysis, telegramConfig.enabled, telegramService, candles, lastSignalSent]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading market data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-red-900/20 border border-red-700 rounded-lg p-6">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Error loading data: {error}</p>
          <button
            onClick={refetch}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Use enhanced analysis if available, otherwise fall back to basic analysis
  const displayAnalysis = enhancedAnalysis || baseAnalysis;

  // If displayAnalysis or indicators are still null after all checks, show insufficient data message
  if (!displayAnalysis || !indicators) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Insufficient data for analysis or analysis is not ready.</p>
        </div>
      </div>
    );
  }

  const currentPrice = candles[candles.length - 1].close;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lụm lúa cùng Tiến Anh</h1>
            <div className="flex items-center space-x-2">
              <p className="text-gray-400 text-sm">Antco AI</p>
              {aiProcessing && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-400">🤖 AI Đang phân tích...</span>
                </div>
              )}
              {/* *** HIỂN THỊ CẢNH BÁO XUNG ĐỘT *** */}
              {!aiProcessing && analysisConflict && (
                <div className="flex items-center space-x-2 bg-yellow-900/50 border border-yellow-700 px-2 py-1 rounded">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-300 font-semibold">
                    Xung đột: TA đề xuất {analysisConflict.ta} nhưng AI quyết định {analysisConflict.ai}
                  </span>
                </div>
              )}
              {!aiProcessing && enhancedAnalysis && !analysisConflict && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">✅ AI loading...</span>
                </div>
              )}
              {!aiProcessing && !enhancedAnalysis && baseAnalysis && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">Chỉ dùng Phân tích Kỹ thuật</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <SymbolSelector
                currentSymbol={currentSymbol}
                onSymbolChange={handleSymbolChange}
              />
            </div>
            <div className="flex items-center space-x-2 mb-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'LIVE' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="text-sm text-gray-400">Last Updated</div>
            <div className="text-sm">{lastUpdate.toLocaleTimeString()}</div>
            <button
              onClick={refetch}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart */}
          <div className="lg:col-span-2">
            <PriceChart 
              candles={candles.slice(-100)} 
              symbol={currentSymbol}
              width={800} 
              height={400} 
              signals={displayAnalysis.signals} 
            />
          </div>

          {/* Right Column - Market Overview */}
          <div>
            <MarketOverview
              analysis={displayAnalysis}
              indicators={indicators}
              symbol={currentSymbol}
              currentPrice={currentPrice}
              priceChange={priceChange}
            />
          </div>
        </div>

        {/* Trading Signals */}
        <div className="mt-6">
          <TradingSignals signals={displayAnalysis.signals} symbol={currentSymbol} />
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
                Lương của mày 500k/ngày thôi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;