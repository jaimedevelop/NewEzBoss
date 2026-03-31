import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AI_MODELS } from '../../../services/collections/collections.ai';
import { AISettings, AIProvider } from '../../../services/collections/collections.ai.types';

interface Props {
    settings: AISettings;
    onUpdate: (partial: Partial<AISettings>) => void;
    onSave: (settings: AISettings) => void;
    isVerifying: boolean;
    verifyStatus: 'idle' | 'success' | 'error';
    verifyError: string | null;
    onVerify: () => void;
    onClose: () => void;
}

const PROVIDERS: { id: AIProvider; label: string }[] = [
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'google', label: 'Google' },
    { id: 'deepseek', label: 'DeepSeek' },
];

const CollectionAISettings: React.FC<Props> = ({
    settings,
    onUpdate,
    onSave,
    isVerifying,
    verifyStatus,
    verifyError,
    onVerify,
    onClose,
}) => {
    const [showKey, setShowKey] = useState(false);

    const modelsForProvider = AI_MODELS.filter(m => m.provider === settings.provider);

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">AI Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure the model used to generate collections</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Provider */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                    <div className="grid grid-cols-2 gap-2">
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => onUpdate({ provider: p.id })}
                                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${settings.provider === p.id
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Model */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <select
                        value={settings.modelId}
                        onChange={e => onUpdate({ modelId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Select a model...</option>
                        {modelsForProvider.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                    {settings.modelId && (
                        <p className="text-xs text-gray-400 mt-1">
                            Context:{' '}
                            {(
                                AI_MODELS.find(m => m.id === settings.modelId)?.contextWindow ?? 0
                            ).toLocaleString()}{' '}
                            tokens
                        </p>
                    )}
                </div>

                {/* API Key */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={settings.apiKey}
                            onChange={e => onUpdate({ apiKey: e.target.value })}
                            placeholder={`Enter your ${settings.provider} API key`}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Your key is stored locally and never sent to our servers.
                    </p>
                </div>

                {/* Verify */}
                <div>
                    <button
                        onClick={onVerify}
                        disabled={!settings.apiKey || !settings.modelId || isVerifying}
                        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            'Test Connection'
                        )}
                    </button>

                    {verifyStatus === 'success' && (
                        <div className="mt-2 flex items-center gap-1.5 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Connection successful
                        </div>
                    )}
                    {verifyStatus === 'error' && (
                        <div className="mt-2 flex items-start gap-1.5 text-red-600 text-sm">
                            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{verifyError || 'Connection failed'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default CollectionAISettings;