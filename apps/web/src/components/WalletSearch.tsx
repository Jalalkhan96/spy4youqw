import { useState, useEffect } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Wallet {
    id: string;
    address: string;
    direction: string;
    metric_count: number;
}

export default function WalletSearch({ onWalletSelect }: { onWalletSelect: (address: string) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    useEffect(() => {
        if (query.length < 3) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/wallets/search?q=${query}`);
                setResults(data);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300); // Debounce

        return () => clearTimeout(timer);
    }, [query]);

    const copyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search wallet address..."
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {results.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto animate-slide-up">
                    {results.map((wallet) => (
                        <div
                            key={wallet.id}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors group"
                            onClick={() => onWalletSelect(wallet.address)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyAddress(wallet.address);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            {copiedAddress === wallet.address ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                            {wallet.direction.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                                            {wallet.metric_count} transactions
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {query.length >= 3 && results.length === 0 && !loading && (
                <div className="absolute z-10 w-full mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl text-center text-sm text-gray-500 dark:text-gray-400">
                    No wallets found
                </div>
            )}
        </div>
    );
}
