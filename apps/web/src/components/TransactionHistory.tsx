import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Clock, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Transaction {
    hash: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
    value: string;
    asset: string;
    blockNum: number;
}

interface HistoryData {
    address: string;
    totalSent: number;
    totalReceived: number;
    transactions: Transaction[];
}

export default function TransactionHistory({ targetId }: { targetId: string | null }) {
    const [data, setData] = useState<HistoryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getFriendlyError = (err: any): string => {
        const errorMsg = err.response?.data?.error || err.message || '';
        if (errorMsg.includes('ENS') || errorMsg.includes('UNSUPPORTED_OPERATION')) {
            return 'ENS names are not supported. Please use a wallet address.';
        }
        if (errorMsg.includes('403') || errorMsg.includes('not enabled')) {
            return 'Unable to fetch transactions. Please check API configuration.';
        }
        return 'Could not load transactions. Please try again.';
    };

    const fetchHistory = async () => {
        if (!targetId) {
            setData(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data: result } = await axios.get(`${API_URL}/targets/${targetId}/history`);
            setData(result);
        } catch (err: any) {
            console.error('Error fetching history:', err);
            setData(null);
            setError(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [targetId]);

    const filteredTransactions = data?.transactions.filter((tx) => {
        if (filter === 'all') return true;
        return tx.type === filter;
    }) || [];

    const formatAddress = (addr: string) => {
        if (!addr) return 'Unknown';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary-500" />
                        Transaction History
                    </h2>
                    {targetId && (
                        <button
                            onClick={fetchHistory}
                            disabled={loading}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>

                {data && (
                    <div className="flex gap-2 mb-3 text-xs">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            📥 {data.totalReceived} received
                        </span>
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                            📤 {data.totalSent} sent
                        </span>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === 'all'
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('received')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === 'received'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                    >
                        Received
                    </button>
                    <button
                        onClick={() => setFilter('sent')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === 'sent'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                    >
                        Sent
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <p className="text-sm text-red-500">{error}</p>
                        <button onClick={fetchHistory} className="mt-3 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg">
                            Try Again
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx, index) => {
                        const otherAddress = tx.type === 'received' ? tx.from : tx.to;
                        const copyId = `${tx.hash}-${index}`;

                        return (
                            <div
                                key={copyId}
                                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                                {/* Header: Type + Value */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {tx.type === 'received' ? (
                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                            </div>
                                        ) : (
                                            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                                            </div>
                                        )}
                                        <span className={`text-xs font-bold ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'received' ? 'RECEIVED' : 'SENT'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {parseFloat(tx.value).toFixed(4)} {tx.asset}
                                        </p>
                                    </div>
                                </div>

                                {/* From/To Address with Copy */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 mb-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                        {tx.type === 'received' ? 'From:' : 'To:'}
                                    </p>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                                            {otherAddress}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(otherAddress, copyId)}
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                            title="Copy address"
                                        >
                                            {copiedId === copyId ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Transaction Hash + View Link */}
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="font-mono">{formatAddress(tx.hash)}</span>
                                    <a
                                        href={`https://base.blockscout.com/tx/${tx.hash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                                    >
                                        View <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Clock className="w-12 h-12 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500">
                            {targetId ? 'No transactions found' : 'Select a target to view history'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
