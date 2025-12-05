import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';
import { supabase } from '../db';
import { sendAlert } from './telegram';

const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET,
};

const alchemy = new Alchemy(config);

export async function pollForEvents(targetId: string) {
    // Get tracked wallets for this target
    const { data: tracked } = await supabase
        .from('tracked_wallets')
        .select('address')
        .eq('target_id', targetId);

    if (!tracked || tracked.length === 0) return;

    const addresses = tracked.map(t => t.address);

    // Poll for recent transfers involving these addresses
    // In a real prod app, we'd track lastBlock per address. 
    // For hackathon, we'll just look at the last few blocks or rely on 'seen_at' dedupe.

    const res = await alchemy.core.getAssetTransfers({
        fromAddress: addresses[0], // Alchemy only allows one 'from' or 'to' filter at a time usually in free tier unless batched
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        maxCount: 10,
    });

    // NOTE: This is a simplified poller. 
    // A robust one would loop through all addresses or use Streams.
    // We will assume Streams is the primary, this is just a placeholder structure.

    console.log(`Polled ${res.transfers.length} events`);
}

export async function processWebhookEvent(event: any) {
    // Handle Alchemy Stream webhook payload
    // event.activity is an array of txs
    if (!event.activity) return;

    for (const tx of event.activity) {
        const { fromAddress, toAddress, hash, value, asset, blockNum } = tx;

        // Check if relevant
        // We need to know which target this is for. 
        // Usually we'd look up the address in our DB to find the target(s).

        const { data: found } = await supabase
            .from('tracked_wallets')
            .select('target_id, address')
            .or(`address.eq.${fromAddress},address.eq.${toAddress}`);

        if (found && found.length > 0) {
            for (const match of found) {
                // Dedupe
                const { error } = await supabase.from('tx_events').insert({
                    tx_hash: hash,
                    block_number: parseInt(blockNum, 16),
                    chain: 'base',
                    from_address: fromAddress,
                    to_address: toAddress,
                    value: value,
                    token_symbol: asset,
                    tracked_address: match.address,
                    target_id: match.target_id,
                    type: match.address.toLowerCase() === fromAddress.toLowerCase() ? 'outgoing' : 'incoming',
                    raw_payload: tx
                });

                if (!error) {
                    // Send Alert
                    const msg = `🔔 *Tracked Activity*\n\n` +
                        `*Tracked*: \`${match.address}\`\n` +
                        `*From*: \`${fromAddress}\`\n` +
                        `*To*: \`${toAddress}\`\n` +
                        `*Value*: ${value} ${asset}\n` +
                        `[View Tx](https://base.blockscout.com/tx/${hash})`;

                    await sendAlert(msg);
                }
            }
        }
    }
}
