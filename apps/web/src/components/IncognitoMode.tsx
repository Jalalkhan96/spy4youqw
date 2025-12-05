import { useState } from 'react';
import axios from 'axios';
import { EyeOff, Search, Loader2, ArrowUpRight, ArrowDownLeft, Copy, Check, ExternalLink, Users, ChevronDown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Transaction {
    hash: string;
    type: 'sent' | 'received';
    from: string;
    to: string;
    value: string;
    asset: string;
}

interface Contact {
    address: string;
    count: number;
    direction: string;
}

interface AnalysisResult {
    address: string;
    totalSent: number;
    totalReceived: number;
    transactions: Transaction[];
    contacts: Contact[];
    mode: string;
}

export default function IncognitoMode() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showAllTx, setShowAllTx] = useState(false);
    const [showAllContacts, setShowAllContacts] = useState(false);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleAnalyze = async (addressToAnalyze?: string) => {
        const targetAddress = addressToAnalyze || address;

        if (!targetAddress.startsWith('0x') || targetAddress.length !== 42) {
            setError('Please enter a valid wallet address (42 characters starting with 0x)');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);
        setShowAllTx(false);
        setShowAllContacts(false);

        try {
            const { data } = await axios.post(`${API_URL}/incognito/analyze`, { address: targetAddress });
            setResult(data);
            setAddress(targetAddress);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze wallet');
        } finally {
            setLoading(false);
        }
    };

    // Display 10 items by default, all if expanded
    const displayedTransactions = result?.transactions.slice(0, showAllTx ? 20 : 10) || [];
    const displayedContacts = result?.contacts.slice(0, showAllContacts ? 10 : 5) || [];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <EyeOff className="w-8 h-8" />
                    <h2 className="text-2xl font-bold">Incognito Mode</h2>
                </div>
                <p className="text-purple-100">
                    🔒 Privacy First - No data is saved to database. Perfect for quick checks.
                </p>
            </div>

            {/* Search Box */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg mb-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter wallet address (0x...)"
                        className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 font-mono text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    />
                    <button
                        onClick={() => handleAnalyze()}
                        disabled={loading || !address}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </div>
                {error && <p className="mt-3 text-red-500 text-sm">{error}</p>}
            </div>

            {/* Results */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Transactions */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ArrowUpRight className="w-5 h-5 text-purple-500" />
                            Transactions ({result.totalSent + result.totalReceived})
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 rounded text-xs">
                                📥 {result.totalReceived} received
                            </span>
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 rounded text-xs">
                                📤 {result.totalSent} sent
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {displayedTransactions.map((tx, i) => {
                                const otherAddress = tx.type === 'received' ? tx.from : tx.to;
                                return (
                                    <div key={`${tx.hash}-${i}`} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {tx.type === 'received' ? (
                                                    <ArrowDownLeft className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <ArrowUpRight className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className={`text-xs font-bold ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type.toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold">{parseFloat(tx.value).toFixed(4)} {tx.asset}</span>
                                        </div>
                                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded">
                                            <button
                                                onClick={() => handleAnalyze(otherAddress)}
                                                className="font-mono text-xs break-all text-left hover:text-purple-600 transition-colors"
                                                title="Click to analyze this wallet"
                                            >
                                                {otherAddress}
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(otherAddress, `${tx.hash}-${i}`)}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ml-2 flex-shrink-0"
                                            >
                                                {copiedId === `${tx.hash}-${i}` ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <a
                                                href={`https://base.blockscout.com/tx/${tx.hash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-purple-600 flex items-center gap-1"
                                            >
                                                View <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Load More Button */}
                        {result.transactions.length > 10 && !showAllTx && (
                            <button
                                onClick={() => setShowAllTx(true)}
                                className="w-full mt-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                                Load More Transactions ({result.transactions.length - 10} more)
                            </button>
                        )}
                    </div>

                    {/* Contacts */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-500" />
                            Top Contacts ({result.contacts.length})
                        </h3>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {displayedContacts.map((contact, i) => (
                                <div key={contact.address} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold ${contact.direction === 'sent_to' ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                            {contact.direction === 'sent_to' ? '📤 SENT TO' : '📥 RECEIVED FROM'}
                                        </span>
                                        <span className="text-sm font-bold">{contact.count} txs</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded">
                                        <button
                                            onClick={() => handleAnalyze(contact.address)}
                                            className="font-mono text-xs break-all text-left hover:text-purple-600 transition-colors"
                                            title="Click to analyze this wallet"
                                        >
                                            {contact.address}
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(contact.address, `contact-${i}`)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ml-2 flex-shrink-0"
                                        >
                                            {copiedId === `contact-${i}` ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Contacts */}
                        {result.contacts.length > 5 && !showAllContacts && (
                            <button
                                onClick={() => setShowAllContacts(true)}
                                className="w-full mt-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                                Show All Contacts ({result.contacts.length - 5} more)
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
                <div className="text-center py-16">
                    <EyeOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Enter a wallet address to analyze in incognito mode</p>
                    <p className="text-gray-400 text-sm mt-2">Click any wallet address in results to analyze it</p>
                </div>
            )}
        </div>
    );
}
