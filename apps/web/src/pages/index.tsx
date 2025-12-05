import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import CreateTarget from '@/components/CreateTarget';
import TrackedList from '@/components/TrackedList';
import LiveFeed from '@/components/LiveFeed';
import TransactionHistory from '@/components/TransactionHistory';
import WalletSearch from '@/components/WalletSearch';
import TrackingHistory from '@/components/TrackingHistory';
import IncognitoMode from '@/components/IncognitoMode';
import ThemeToggle from '@/components/ThemeToggle';
import { Activity, Target, Search, History, EyeOff, Eye } from 'lucide-react';

export default function Dashboard() {
    const [targetId, setTargetId] = useState<string | null>(null);
    const [targetAddress, setTargetAddress] = useState<string>('');
    const [isIncognito, setIsIncognito] = useState(false);

    const handleWalletSelect = (address: string) => {
        console.log('Selected wallet:', address);
    };

    const handleSelectFromHistory = (id: string, address: string) => {
        setTargetId(id);
        setTargetAddress(address);
    };

    const handleTargetCreated = (id: string) => {
        setTargetId(id);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
            {/* Incognito Banner */}
            {isIncognito && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 text-sm">
                    <EyeOff className="w-4 h-4 inline mr-2" />
                    Incognito Mode - No data will be saved to database
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shadow-lg ${isIncognito
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-br from-primary-500 to-primary-600'
                                }`}>
                                {isIncognito ? <EyeOff className="w-6 h-6 text-white" /> : <Activity className="w-6 h-6 text-white" />}
                            </div>
                            <h1 className={`text-2xl font-bold bg-clip-text text-transparent ${isIncognito
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-500'
                                : 'bg-gradient-to-r from-primary-600 to-accent-500'
                                }`}>
                                TrackVerse {isIncognito && '(Incognito)'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Incognito Toggle */}
                            <button
                                onClick={() => setIsIncognito(!isIncognito)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${isIncognito
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                            >
                                {isIncognito ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {isIncognito ? 'Incognito ON' : 'Incognito OFF'}
                            </button>
                            <ThemeToggle />
                            <ConnectButton />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1800px] mx-auto px-6 py-8">
                {isIncognito ? (
                    // Incognito Mode UI
                    <IncognitoMode />
                ) : (
                    // Normal Mode UI
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Sidebar - Transaction History */}
                        <div className="lg:col-span-3">
                            <div className="sticky top-24 h-[calc(100vh-7rem)]">
                                <TransactionHistory targetId={targetId} />
                            </div>
                        </div>

                        {/* Middle Column - Controls */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Wallet Search */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg card-hover">
                                <div className="flex items-center gap-2 mb-4">
                                    <Search className="w-5 h-5 text-primary-500" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Search Wallets
                                    </h2>
                                </div>
                                <WalletSearch onWalletSelect={handleWalletSelect} />
                            </div>

                            {/* Create Target */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg card-hover">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target className="w-5 h-5 text-primary-500" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Target Wallet
                                    </h2>
                                </div>
                                <CreateTarget onTargetCreated={handleTargetCreated} />
                            </div>

                            {/* Tracking History */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg card-hover">
                                <div className="flex items-center gap-2 mb-4">
                                    <History className="w-5 h-5 text-primary-500" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Tracking History
                                    </h2>
                                </div>
                                <TrackingHistory
                                    onSelectTarget={handleSelectFromHistory}
                                    currentTargetId={targetId}
                                />
                            </div>

                            {/* Tracked Wallets */}
                            {targetId && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg card-hover animate-slide-up">
                                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                                        Discovered Contacts
                                    </h2>
                                    <TrackedList targetId={targetId} />
                                </div>
                            )}
                        </div>

                        {/* Right Column - Live Feed */}
                        <div className="lg:col-span-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg min-h-[calc(100vh-7rem)]">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        Live Activity Feed
                                    </h2>
                                </div>
                                {targetId ? (
                                    <LiveFeed targetId={targetId} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[500px] text-center">
                                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                            <Activity className="w-10 h-10 text-gray-400" />
                                        </div>
                                        <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                                            No Target Selected
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500 max-w-md">
                                            Create or select a target wallet to view live transaction events in real-time
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
