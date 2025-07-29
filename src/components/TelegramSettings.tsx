import React, { useState } from 'react';
import { TelegramConfig } from '../types/trading';
import { Send, Settings, Eye, EyeOff } from 'lucide-react';

interface TelegramSettingsProps {
  config: TelegramConfig;
  onConfigChange: (config: TelegramConfig) => void;
  onTestMessage: () => void;
}

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({
  config,
  onConfigChange,
  onTestMessage
}) => {
  const [showToken, setShowToken] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Changed to true to expand by default

  // Ensure the initial config passed from the parent component has enabled: true
  // If config.enabled is explicitly false, it will override this, so ensure your
  // parent component provides { enabled: true, ...otherConfig } initially.
  React.useEffect(() => {
    if (config.enabled === undefined) { // Check if enabled is not explicitly set
      onConfigChange({ ...config, enabled: true });
    }
  }, [config.enabled]); // Only re-run if config.enabled changes

  const handleInputChange = (field: keyof TelegramConfig, value: string | boolean) => {
    onConfigChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Telegram Alerts</span>
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="telegram-enabled"
              checked={config.enabled} // This will now be true by default if the parent passes it as such
              onChange={(e) => handleInputChange('enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="telegram-enabled" className="text-white">
              Enable Telegram Alerts
            </label>
          </div>

          {config.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bot Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={config.botToken}
                    onChange={(e) => handleInputChange('botToken', e.target.value)}
                    placeholder="Enter your Telegram bot token"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={config.chatId}
                  onChange={(e) => handleInputChange('chatId', e.target.value)}
                  placeholder="Enter your chat ID or group ID"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={onTestMessage}
                disabled={!config.botToken || !config.chatId}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Test Message</span>
              </button>

              <div className="text-xs text-gray-400 space-y-1">
                <p>• Chỉ gửi thông báo khi có tín hiệu STRONG hoặc VERY_STRONG</p>
                <p>• Tạo bot tại: @BotFather trên Telegram</p>
                <p>• Lấy Chat ID: @userinfobot hoặc @chatid_echo_bot</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};