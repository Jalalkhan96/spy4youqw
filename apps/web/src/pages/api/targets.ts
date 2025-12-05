import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, id } = req.query;

    try {
        // GET /api/targets - Get all targets
        if (req.method === 'GET' && !action) {
            const { data, error } = await supabase
                .from('targets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) return res.status(400).json({ error });
            return res.json(data);
        }

        // POST /api/targets - Create target
        if (req.method === 'POST' && !action) {
            const { owner, chain } = req.body;
            const { data, error } = await supabase
                .from('targets')
                .insert({ owner_wallet: owner, chain })
                .select()
                .single();

            if (error) return res.status(400).json({ error });
            return res.json(data);
        }

        // GET /api/targets?id=xxx - Get single target
        if (req.method === 'GET' && id && !action) {
            const { data, error } = await supabase
                .from('targets')
                .select('*')
                .eq('id', id)
                .single();

            if (error) return res.status(404).json({ error });
            return res.json(data);
        }

        // GET /api/targets?id=xxx&action=tracked - Get tracked wallets
        if (req.method === 'GET' && id && action === 'tracked') {
            const { data, error } = await supabase
                .from('tracked_wallets')
                .select('*')
                .eq('target_id', id);

            if (error) return res.status(400).json({ error });
            return res.json(data);
        }

        // GET /api/targets?id=xxx&action=history - Get transaction history
        if (req.method === 'GET' && id && action === 'history') {
            const { data: target } = await supabase
                .from('targets')
                .select('owner_wallet')
                .eq('id', id)
                .single();

            if (!target) return res.status(404).json({ error: 'Target not found' });

            const targetAddress = target.owner_wallet.toLowerCase();

            const [sentTx, receivedTx] = await Promise.all([
                alchemy.core.getAssetTransfers({
                    fromAddress: targetAddress,
                    category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                    maxCount: 10,
                    order: 'desc' as any,
                }),
                alchemy.core.getAssetTransfers({
                    toAddress: targetAddress,
                    category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                    maxCount: 10,
                    order: 'desc' as any,
                }),
            ]);

            const formatTx = (tx: any, type: 'sent' | 'received') => ({
                hash: tx.hash,
                type,
                from: tx.from,
                to: tx.to,
                value: tx.value?.toFixed(6) || '0',
                asset: tx.asset || 'ETH',
                blockNum: parseInt(tx.blockNum, 16),
            });

            const sent = sentTx.transfers.map(tx => formatTx(tx, 'sent'));
            const received = receivedTx.transfers.map(tx => formatTx(tx, 'received'));
            const allTx = [...sent, ...received].sort((a, b) => b.blockNum - a.blockNum);

            return res.json({
                address: target.owner_wallet,
                totalSent: sent.length,
                totalReceived: received.length,
                transactions: allTx.slice(0, 20),
            });
        }

        // POST /api/targets?id=xxx&action=discover - Trigger discovery
        if (req.method === 'POST' && id && action === 'discover') {
            const { data: target } = await supabase
                .from('targets')
                .select('owner_wallet')
                .eq('id', id)
                .single();

            if (!target) return res.status(404).json({ error: 'Target not found' });

            const targetAddress = target.owner_wallet.toLowerCase();

            const [sentTo, receivedFrom] = await Promise.all([
                alchemy.core.getAssetTransfers({
                    fromAddress: targetAddress,
                    category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                    maxCount: 100,
                }),
                alchemy.core.getAssetTransfers({
                    toAddress: targetAddress,
                    category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                    maxCount: 100,
                }),
            ]);

            // Aggregate contacts
            const aggregate = (transfers: any[], direction: string) => {
                const map = new Map();
                for (const tx of transfers) {
                    const other = tx.from === targetAddress ? tx.to : tx.from;
                    if (!other) continue;
                    const val = parseFloat(tx.value || '0');
                    const existing = map.get(other) || { address: other, count: 0, totalValue: 0 };
                    existing.count++;
                    existing.totalValue += val;
                    map.set(other, existing);
                }
                return Array.from(map.values());
            };

            const sentStats = aggregate(sentTo.transfers, 'sent_to').slice(0, 10);
            const receivedStats = aggregate(receivedFrom.transfers, 'received_from').slice(0, 10);

            // Save to DB
            for (const item of sentStats) {
                await supabase.from('tracked_wallets').upsert({
                    target_id: id,
                    address: item.address,
                    direction: 'sent_to',
                    metric_count: item.count,
                }, { onConflict: 'target_id, address' });
            }

            for (const item of receivedStats) {
                await supabase.from('tracked_wallets').upsert({
                    target_id: id,
                    address: item.address,
                    direction: 'received_from',
                    metric_count: item.count,
                }, { onConflict: 'target_id, address' });
            }

            await supabase.from('targets').update({ last_discovered_at: new Date() }).eq('id', id);

            return res.json({ topSent: sentStats, topReceived: receivedStats });
        }

        return res.status(404).json({ error: 'Not found' });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
