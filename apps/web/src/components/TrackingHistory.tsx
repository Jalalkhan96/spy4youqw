import { useEffect, useState } from 'react';
import axios from 'axios';
import { History, Loader2, Clock, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Target {
    id: string;
    owner_wallet: string;
    chain: string;
    created_at: string;
    last_discovered_at: string | null;
}

interface TrackingHistoryProps {
    onSelectTarget: (id: string, address: string) => void;
    currentTargetId: string | null;
}

export default function TrackingHistory({ onSelectTarget, currentTargetId }: TrackingHistoryProps) {
    const [targets, setTargets] = useState<Target[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/targets`);
                setTargets(data || []);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [currentTargetId]); // Refresh when new target is added

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (targets.length === 0) {
        return (
            <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No tracking history yet
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {targets.map((target) => (
                <button
                    key={target.id}
                    onClick={() => onSelectTarget(target.id, target.owner_wallet)}
                    className={`w-full p-3 rounded-lg border transition-all text-left group ${currentTargetId === target.id
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                                {target.owner_wallet.slice(0, 8)}...{target.owner_wallet.slice(-6)}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(target.created_at)}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${currentTargetId === target.id
                                ? 'text-primary-500'
                                : 'text-gray-400 group-hover:translate-x-1'
                            }`} />
                    </div>
                </button>
            ))}
        </div>
    );
}
