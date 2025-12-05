import type { NextApiRequest, NextApiResponse } from 'next';
import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';

const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { address } = req.body;

    if (!address || !address.startsWith('0x') || address.length !== 42) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
        const targetAddress = address.toLowerCase();

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

        return res.json({
            address,
            totalSent: sent.length,
            totalReceived: received.length,
            transactions: allTx.slice(0, 20),
            contacts: topContacts,
            mode: 'incognito',
        });

    } catch (error: any) {
        console.error('Incognito analyze error:', error);
        return res.status(500).json({ error: error.message || 'Analysis failed' });
    }
}
