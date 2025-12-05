import { useEffect, useState } from 'react';
import axios from 'axios';
import { Copy, Check, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function TrackedList({ targetId }: { targetId: string }) {
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchWallets = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/targets/${targetId}/tracked`);
                setWallets(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        // Fetch wallets once when targetId changes (no polling)
        fetchWallets();
    }, [targetId]);

    const copyAddress = (address: string, id: string) => {
        navigator.clipboard.writeText(address);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {wallets.map((w, index) => (
                <div
                    key={w.id}
                    className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-all card-hover group animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            {w.direction === 'incoming' || w.direction === 'both_incoming' ? (
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                            ) : (
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100 font-medium">
                                        {w.address.slice(0, 6)}...{w.address.slice(-4)}
                                    </span>
                                    <button
                                        onClick={() => copyAddress(w.address, w.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {copiedId === w.id ? (
                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                        )}
                                    </button>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5 block">
                                    {w.direction.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {w.metric_count}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                transactions
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {wallets.length === 0 && (
                <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Scanning history...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        This may take a few moments
                    </p>
                </div>
            )}
        </div>
    );
}
