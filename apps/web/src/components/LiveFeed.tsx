import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2 } from 'lucide-react';

// Initialize Supabase Client for Realtime
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LiveFeed({ targetId }: { targetId: string }) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setEvents([]);

        // Subscribe to realtime
        const channel = supabase
            .channel('realtime-events')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tx_events',
                    filter: `target_id=eq.${targetId}`
                },
                (payload) => {
                    setEvents((prev) => [payload.new, ...prev]);
                    setLoading(false);
                }
            )
            .subscribe();

        // Set loading to false after a short delay if no events come in
        const timer = setTimeout(() => setLoading(false), 2000);

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [targetId]);

    if (loading && events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connecting to live feed...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {events.map((ev, index) => (
                <div
                    key={ev.id}
                    className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-all card-hover animate-slide-up shadow-sm"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            {ev.type === 'incoming' ? (
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                            ) : (
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                            )}
                            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${ev.type === 'incoming'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                {ev.type === 'incoming' ? 'RECEIVED' : 'SENT'}
                            </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {new Date(ev.seen_at).toLocaleTimeString()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">From</span>
                            <span className="font-mono text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {ev.from_address.slice(0, 8)}...{ev.from_address.slice(-6)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">To</span>
                            <span className="font-mono text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {ev.to_address.slice(0, 8)}...{ev.to_address.slice(-6)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {ev.value} <span className="text-sm text-gray-600 dark:text-gray-400">{ev.token_symbol || 'ETH'}</span>
                        </div>
                        <a
                            href={`https://base.blockscout.com/tx/${ev.tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium group"
                        >
                            View Transaction
                            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                    </div>
                </div>
            ))}

            {events.length === 0 && !loading && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ArrowUpRight className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Waiting for live transactions...
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        Try sending a small amount to one of the tracked wallets.
                    </p>
                </div>
            )}
        </div>
    );
}
