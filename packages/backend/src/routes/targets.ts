import express from 'express';
import { supabase } from '../db';
import { discoverWallets } from '../services/discovery';
import { processWebhookEvent } from '../services/watcher';
import { sendAlert } from '../services/telegram';
import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';

const router = express.Router();

// Alchemy instance for incognito mode
const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET,
});

// ========================================
// INCOGNITO MODE - No data saved to DB
// ========================================

// Incognito: Analyze wallet without saving
router.post('/incognito/analyze', async (req, res) => {
    const { address } = req.body;

    if (!address || !address.startsWith('0x') || address.length !== 42) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
        const targetAddress = address.toLowerCase();

        // Fetch transactions
        const [sentTx, receivedTx] = await Promise.all([
            alchemy.core.getAssetTransfers({
                fromAddress: targetAddress,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 20,
                order: 'desc' as any,
            }),
            alchemy.core.getAssetTransfers({
                toAddress: targetAddress,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 20,
                order: 'desc' as any,
            }),
        ]);

        // Format transactions
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

        // Aggregate contacts
        const contacts = new Map<string, { count: number; direction: string }>();

        sentTx.transfers.forEach(tx => {
            if (tx.to) {
                const existing = contacts.get(tx.to) || { count: 0, direction: 'sent_to' };
                existing.count++;
                contacts.set(tx.to, existing);
            }
        });

        receivedTx.transfers.forEach(tx => {
            if (tx.from) {
                const existing = contacts.get(tx.from) || { count: 0, direction: 'received_from' };
                existing.count++;
                contacts.set(tx.from, existing);
            }
        });

        const topContacts = Array.from(contacts.entries())
            .map(([addr, data]) => ({ address: addr, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            address,
            totalSent: sent.length,
            totalReceived: received.length,
            transactions: allTx.slice(0, 20),
            contacts: topContacts,
            mode: 'incognito', // Indicator that no data was saved
        });

    } catch (e: any) {
        console.error('Incognito analyze error:', e);
        res.status(500).json({ error: e.message || 'Analysis failed' });
    }
});

// ========================================
// NORMAL MODE - Data saved to DB
// ========================================

// Get All Targets (Tracking History)
router.get('/targets', async (req, res) => {
    const { data, error } = await supabase
        .from('targets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error });
    res.json(data);
});

// Create Target
router.post('/targets', async (req, res) => {
    const { owner, chain } = req.body;
    const { data, error } = await supabase
        .from('targets')
        .insert({ owner_wallet: owner, chain })
        .select()
        .single();

    if (error) return res.status(400).json({ error });

    // Send Telegram notification for new target
    const shortAddr = `${owner.slice(0, 6)}...${owner.slice(-4)}`;
    await sendAlert(`🎯 *New Target Added*\n\nWallet: \`${shortAddr}\`\nChain: ${chain || 'base'}`);

    res.json(data);
});

// Get Target
router.get('/targets/:id', async (req, res) => {
    const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('id', req.params.id)
        .single();
    if (error) return res.status(404).json({ error });
    res.json(data);
});

// Trigger Discovery
router.post('/targets/:id/discover', async (req, res) => {
    const { id } = req.params;

    // Get target address
    const { data: target } = await supabase.from('targets').select('owner_wallet').eq('id', id).single();
    if (!target) return res.status(404).json({ error: 'Target not found' });

    try {
        const results = await discoverWallets(id, target.owner_wallet);
        res.json(results);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get Tracked Wallets
router.get('/targets/:id/tracked', async (req, res) => {
    const { data, error } = await supabase
        .from('tracked_wallets')
        .select('*')
        .eq('target_id', req.params.id);

    if (error) return res.status(400).json({ error });
    res.json(data);
});

// Search Wallets
router.get('/wallets/search', async (req, res) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 3) {
        return res.json([]);
    }

    try {
        const { data, error } = await supabase
            .from('tracked_wallets')
            .select('*')
            .ilike('address', `%${q}%`)
            .limit(10);

        if (error) return res.status(400).json({ error });
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get Recent Transactions (from database)
router.get('/targets/:id/transactions/recent', async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const { data, error } = await supabase
            .from('tx_events')
            .select('*')
            .eq('target_id', id)
            .order('seen_at', { ascending: false })
            .limit(limit);

        if (error) return res.status(400).json({ error });
        res.json(data || []);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get Transaction History from Alchemy (live data)
router.get('/targets/:id/history', async (req, res) => {
    const { id } = req.params;

    // Get target address
    const { data: target } = await supabase.from('targets').select('owner_wallet').eq('id', id).single();
    if (!target) return res.status(404).json({ error: 'Target not found' });

    const targetAddress = target.owner_wallet.toLowerCase();

    try {
        const { Alchemy, Network, AssetTransfersCategory } = await import('alchemy-sdk');

        const alchemy = new Alchemy({
            apiKey: process.env.ALCHEMY_API_KEY,
            network: Network.BASE_MAINNET,
        });

        // Fetch outgoing transactions (sent)
        const sentTx = await alchemy.core.getAssetTransfers({
            fromAddress: targetAddress,
            category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
            maxCount: 10,
            order: 'desc' as any,
        });

        // Fetch incoming transactions (received)
        const receivedTx = await alchemy.core.getAssetTransfers({
            toAddress: targetAddress,
            category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
            maxCount: 10,
            order: 'desc' as any,
        });

        // Format transactions
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

        // Combine and sort by block number
        const allTx = [...sent, ...received].sort((a, b) => b.blockNum - a.blockNum);

        res.json({
            address: target.owner_wallet,
            totalSent: sent.length,
            totalReceived: received.length,
            transactions: allTx.slice(0, 20),
        });
    } catch (e: any) {
        console.error('Error fetching history:', e);
        res.status(500).json({ error: e.message });
    }
});

// Webhook for Streams
router.post('/webhook/stream', async (req, res) => {
    // Verify signature (skipped for hackathon speed, but recommended)
    await processWebhookEvent(req.body);
    res.json({ received: true });
});

export default router;
