import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';
import { supabase } from '../db';
import { sendAlert } from './telegram';

const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET, // Default to Base Mainnet
};

const alchemy = new Alchemy(config);

interface TransferStats {
    address: string;
    count: number;
    totalValue: number;
    lastSeen: number; // block number
}

export async function discoverWallets(targetId: string, targetAddress: string) {
    console.log(`Starting discovery for ${targetAddress}...`);

    // 1. Fetch Outgoing (Sent To)
    const sentTo = await alchemy.core.getAssetTransfers({
        fromAddress: targetAddress,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        maxCount: 100, // Limit for hackathon
    });

    // 2. Fetch Incoming (Received From)
    const receivedFrom = await alchemy.core.getAssetTransfers({
        toAddress: targetAddress,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        maxCount: 100,
    });

    // Helper to aggregate
    const aggregate = (transfers: any[]) => {
        const map = new Map<string, TransferStats>();
        for (const tx of transfers) {
            const other = tx.from === targetAddress.toLowerCase() ? tx.to : tx.from;
            if (!other) continue;

            const val = parseFloat(tx.value || '0');
            const existing = map.get(other) || { address: other, count: 0, totalValue: 0, lastSeen: 0 };
            existing.count++;
            existing.totalValue += val;
            // simplistic block check
            const blockNum = parseInt(tx.blockNum, 16);
            if (blockNum > existing.lastSeen) existing.lastSeen = blockNum;

            map.set(other, existing);
        }
        return Array.from(map.values());
    };

    const sentStats = aggregate(sentTo.transfers);
    const receivedStats = aggregate(receivedFrom.transfers);

    // Sort Top 10 by count
    const topSent = sentStats.sort((a, b) => b.count - a.count).slice(0, 10);
    const topReceived = receivedStats.sort((a, b) => b.count - a.count).slice(0, 10);

    // Sort Recent 10 by block
    const recentSent = sentStats.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 10);
    const recentReceived = receivedStats.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 10);

    // Save to DB
    const saveBatch = async (list: TransferStats[], direction: string) => {
        for (const item of list) {
            await supabase.from('tracked_wallets').upsert({
                target_id: targetId,
                address: item.address,
                direction,
                metric_count: item.count,
                metric_total_value: item.totalValue,
            }, { onConflict: 'target_id, address' });
        }
    };

    await saveBatch(topSent, 'sent_to');
    await saveBatch(topReceived, 'received_from');
    // For simplicity in hackathon, we might overwrite or just add. 
    // Ideally we'd have separate rows or tags. 
    // Here we just upsert, so 'recent' might overwrite 'top' if same address, which is fine.
    await saveBatch(recentSent, 'recent_sent');
    await saveBatch(recentReceived, 'recent_received');

    // Update target last_discovered_at
    await supabase.from('targets').update({ last_discovered_at: new Date() }).eq('id', targetId);

    // 🔔 Send Telegram Notification
    const shortAddr = `${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`;
    const totalContacts = new Set([...sentStats.map(s => s.address), ...receivedStats.map(r => r.address)]).size;
    const totalTxSent = sentTo.transfers.length;
    const totalTxReceived = receivedFrom.transfers.length;

    await sendAlert(
        `🔍 *Wallet Discovery Complete*\n\n` +
        `📍 *Wallet:* \`${shortAddr}\`\n` +
        `👥 *Unique Contacts:* ${totalContacts}\n` +
        `📤 *Sent Transactions:* ${totalTxSent}\n` +
        `📥 *Received Transactions:* ${totalTxReceived}\n\n` +
        `Top sender: \`${topReceived[0]?.address.slice(0, 10) || 'N/A'}...\`\n` +
        `Top receiver: \`${topSent[0]?.address.slice(0, 10) || 'N/A'}...\``
    );

    return { topSent, topReceived, recentSent, recentReceived };
}

