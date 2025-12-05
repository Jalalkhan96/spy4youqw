import { useState } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function CreateTarget({ onTargetCreated }: { onTargetCreated: (id: string) => void }) {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Convert technical errors to human-friendly messages
    const getFriendlyError = (err: any): string => {
        const errorMsg = err.response?.data?.error || err.message || '';

        // Check for common error patterns
        if (errorMsg.includes('ENS') || errorMsg.includes('UNSUPPORTED_OPERATION')) {
            return 'This network does not support ENS names. Please enter a valid wallet address (0x...).';
        }
        if (errorMsg.includes('invalid address') || errorMsg.includes('Invalid address')) {
            return 'Please enter a valid wallet address starting with 0x.';
        }
        if (errorMsg.includes('API key') || errorMsg.includes('403')) {
            return 'Service temporarily unavailable. Please try again later.';
        }
        if (errorMsg.includes('network') || errorMsg.includes('Network')) {
            return 'Network error. Please check your connection and try again.';
        }
        if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
            return 'Request timed out. Please try again.';
        }
        if (errorMsg.includes('not found') || errorMsg.includes('404')) {
            return 'Wallet not found or has no transaction history.';
        }

        // Default friendly message
        return 'Something went wrong. Please check the wallet address and try again.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        // Validate address format
        if (!address.startsWith('0x') || address.length !== 42) {
            setError('Please enter a valid wallet address (42 characters starting with 0x).');
            setLoading(false);
            return;
        }

        try {
            // 1. Create Target
            const { data: target } = await axios.post(`${API_URL}/targets`, {
                owner: address,
                chain: 'base'
            });

            onTargetCreated(target.id);
            setSuccess(true);

            // 2. Trigger Discovery (Async)
            await axios.post(`${API_URL}/targets/${target.id}/discover`);

            // Reset form after success
            setTimeout(() => {
                setAddress('');
                setSuccess(false);
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setError(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Wallet Address
                </label>
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 truncate"
                    required
                    disabled={loading}
                />
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-up">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-slide-up">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400">Target created successfully!</p>
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !address}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Discovering Wallets...
                    </>
                ) : (
                    'Start Tracking'
                )}
            </button>
        </form>
    );
}
