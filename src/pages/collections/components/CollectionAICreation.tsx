import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Settings,
    Send,
    Loader2,
    Sparkles,
    RotateCcw,
    Save,
    Package,
    Wrench,
    HardHat,
    Truck,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useCollectionAI } from '../../../hooks/collections/useCollectionAI';
import CollectionAISettings from './CollectionAISettings';
import CollectionAIScopeSelector, { AIScopeSelection } from './CollectionAIScopeSelector';
import { AICollectionResult, AIInventoryContext } from '../../../services/collections/ai/collections.ai.types';
import { useAuthContext } from '../../../contexts/AuthContext';

const SUGGESTION_PROMPTS = [
    'Toilet installation',
    'Kitchen faucet replacement',
    'Electrical panel upgrade',
    'HVAC filter replacement and tune-up',
    'Drywall patch and paint',
    'Bathroom tile installation',
];

const CollectionAICreation: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [showSettings, setShowSettings] = useState(false);
    const [showScopeSelector, setShowScopeSelector] = useState(false);
    const [resultExpanded, setResultExpanded] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const {
        settings,
        updateSettings,
        persistSettings,
        isVerifying,
        verifyStatus,
        verifyError,
        handleVerifyKey,
        messages,
        inputValue,
        setInputValue,
        isLoading,
        loadingStage,
        isLoadingInventory,
        error,
        sendMessage,
        resetChat,
        inventoryContext,
        result,
        isSaving,
        saveCollection,
        scopeSelection,
        setScopeSelection,
    } = useCollectionAI();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleApplyScope = (scope: AIScopeSelection) => {
        const isEmpty =
            scope.products.length === 0 &&
            scope.labor.length === 0 &&
            scope.tools.length === 0 &&
            scope.equipment.length === 0;
        setScopeSelection(isEmpty ? null : scope);
    };

    const clearScope = () => setScopeSelection(null);

    const scopeChipCount =
        (scopeSelection?.products.length ?? 0) +
        (scopeSelection?.labor.length ?? 0) +
        (scopeSelection?.tools.length ?? 0) +
        (scopeSelection?.equipment.length ?? 0);

    const hasApiKey = !!settings.apiKey && !!settings.modelId;

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/collections/create')}
                        className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back
                    </button>
                    <div className="w-px h-5 bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-900 leading-none">AI Collection Creator</h1>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {settings.modelId
                                    ? `Using ${settings.modelId}`
                                    : 'No model selected — open Settings'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={resetChat}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(v => !v)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${showSettings
                            ? 'border-orange-300 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main chat area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Welcome state */}
                        {messages.length === 0 && (
                            <div className="max-w-xl mx-auto pt-8">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4">
                                        <Sparkles className="w-7 h-7 text-orange-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                        Describe your job
                                    </h2>
                                    <p className="text-gray-500 text-sm">
                                        Tell me what you're working on and I'll select the right products, labor, tools,
                                        and equipment from your inventory.
                                    </p>
                                </div>

                                {!hasApiKey && (
                                    <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                                        <Settings className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>
                                            Open <strong>Settings</strong> to add your API key before generating a
                                            collection.
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                        Try one of these
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SUGGESTION_PROMPTS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                disabled={!hasApiKey || isLoading}
                                                className="text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat messages */}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                                        ? 'bg-orange-600 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                        }`}
                                >
                                    <MessageContent content={msg.content} />
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {(isLoading || isLoadingInventory) && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                    {isLoadingInventory
                                        ? 'Loading your inventory...'
                                        : loadingStage === 'classifying'
                                            ? 'Identifying trade and keywords...'
                                            : 'Building your collection...'}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="max-w-lg mx-auto p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* AI Result summary card */}
                        {result && inventoryContext && (
                            <div className="max-w-lg mx-auto">
                                <ResultCard
                                    result={result}
                                    inventoryContext={inventoryContext}
                                    expanded={resultExpanded}
                                    onToggle={() => setResultExpanded(v => !v)}
                                    onSave={saveCollection}
                                    isSaving={isSaving}
                                />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="bg-white border-t border-gray-200 p-3">
                        {/* Scope chip */}
                        {scopeSelection && scopeChipCount > 0 && (
                            <div className="flex items-center gap-2 mb-2 max-w-3xl mx-auto">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs text-orange-700">
                                    <SlidersHorizontal className="w-3 h-3" />
                                    <span>
                                        Scoped to {scopeChipCount} categor{scopeChipCount !== 1 ? 'ies' : 'y'}
                                    </span>
                                    <button
                                        onClick={clearScope}
                                        className="ml-0.5 hover:text-orange-900"
                                        aria-label="Clear scope"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowScopeSelector(true)}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                >
                                    Edit
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 max-w-3xl mx-auto">
                            {/* Scope button */}
                            <button
                                onClick={() => setShowScopeSelector(true)}
                                title="Scope inventory"
                                className={`p-2.5 rounded-xl border flex-shrink-0 transition-colors ${scopeSelection
                                    ? 'border-orange-300 bg-orange-50 text-orange-600'
                                    : 'border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>

                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    hasApiKey
                                        ? 'Describe a job (e.g. "Toilet installation") — press Enter to send'
                                        : 'Add your API key in Settings first...'
                                }
                                disabled={isLoading || !hasApiKey}
                                rows={1}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-400"
                                style={{ maxHeight: 120 }}
                                onInput={e => {
                                    const t = e.currentTarget;
                                    t.style.height = 'auto';
                                    t.style.height = `${t.scrollHeight}px`;
                                }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!inputValue.trim() || isLoading || !hasApiKey}
                                className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-1.5">
                            Shift+Enter for new line · Enter to send
                        </p>
                    </div>
                </div>

                {/* Settings panel */}
                {showSettings && (
                    <div className="w-72 border-l border-gray-200 bg-white flex-shrink-0">
                        <CollectionAISettings
                            settings={settings}
                            onUpdate={updateSettings}
                            onSave={persistSettings}
                            isVerifying={isVerifying}
                            verifyStatus={verifyStatus}
                            verifyError={verifyError}
                            onVerify={handleVerifyKey}
                            onClose={() => setShowSettings(false)}
                        />
                    </div>
                )}
            </div>

            {/* Scope selector modal */}
            {showScopeSelector && currentUser && (
                <CollectionAIScopeSelector
                    userId={currentUser.uid}
                    initialScope={scopeSelection ?? undefined}
                    onApply={handleApplyScope}
                    onClose={() => setShowScopeSelector(false)}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-components (unchanged)
// ---------------------------------------------------------------------------

function MessageContent({ content }: { content: string }) {
    const lines = content.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return (
                    <p
                        key={i}
                        dangerouslySetInnerHTML={{ __html: bold }}
                        className={line.startsWith('•') ? 'pl-1' : ''}
                    />
                );
            })}
        </div>
    );
}

interface ResultCardProps {
    result: AICollectionResult;
    inventoryContext: AIInventoryContext;
    expanded: boolean;
    onToggle: () => void;
    onSave: () => void;
    isSaving: boolean;
}

function ResultCard({ result, inventoryContext, expanded, onToggle, onSave, isSaving }: ResultCardProps) {
    const sections = [
        {
            icon: Package,
            label: 'Products',
            color: 'text-blue-600',
            items: result.selectedProducts.map(sel => ({
                ...sel,
                name: inventoryContext.products.find(p => p.id === sel.id)?.name ?? sel.id,
            })),
        },
        {
            icon: HardHat,
            label: 'Labor',
            color: 'text-green-600',
            items: result.selectedLabor.map(sel => ({
                ...sel,
                name: inventoryContext.labor.find(l => l.id === sel.id)?.name ?? sel.id,
            })),
        },
        {
            icon: Wrench,
            label: 'Tools',
            color: 'text-purple-600',
            items: result.selectedTools.map(sel => ({
                ...sel,
                name: inventoryContext.tools.find(t => t.id === sel.id)?.name ?? sel.id,
            })),
        },
        {
            icon: Truck,
            label: 'Equipment',
            color: 'text-orange-600',
            items: result.selectedEquipment.map(sel => ({
                ...sel,
                name: inventoryContext.equipment.find(e => e.id === sel.id)?.name ?? sel.id,
            })),
        },
    ].filter(s => s.items.length > 0);

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

    return (
        <div className="bg-white border border-orange-200 rounded-xl shadow-sm overflow-hidden">
            <div
                className="flex items-center justify-between px-4 py-3 bg-orange-50 cursor-pointer"
                onClick={onToggle}
            >
                <div>
                    <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">
                        Collection Preview
                    </p>
                    <h3 className="text-sm font-semibold text-gray-900 mt-0.5">{result.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                    </span>
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </div>

            {expanded && (
                <div className="px-4 py-3 space-y-3 border-t border-orange-100">
                    {result.description && (
                        <p className="text-xs text-gray-500">{result.description}</p>
                    )}
                    {sections.map(({ icon: Icon, label, color, items }) => (
                        <div key={label}>
                            <div className="flex items-center gap-1.5 mb-1">
                                <Icon className={`w-3.5 h-3.5 ${color}`} />
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    {label} ({items.length})
                                </span>
                            </div>
                            <ul className="space-y-0.5 pl-5">
                                {items.map((item, i) => (
                                    <li key={i} className="text-xs text-gray-700 flex items-center justify-between">
                                        <span>{item.name}</span>
                                        {item.quantity !== 1 && (
                                            <span className="text-gray-400 ml-2">×{item.quantity}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            <div className="px-4 py-3 border-t border-gray-100">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Collection
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default CollectionAICreation;