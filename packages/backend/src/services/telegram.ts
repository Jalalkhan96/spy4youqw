import TelegramBot from 'node-telegram-bot-api';
import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot: TelegramBot | null = null;

// Initialize Alchemy for tracking
const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.BASE_MAINNET,
});

if (token) {
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram bot started with polling enabled');

    // /start command
    bot.onText(/\/start/, (msg) => {
        const welcomeMessage = `
🔍 *Welcome to TrackVerse Bot!*

I can help you track wallet transactions on Base network.

*Available Commands:*
/track \`0x...\` - Track a wallet and see its contacts
/history \`0x...\` - Get recent transactions
/more \`0x...\` - Get extended transaction history (20 txs)
/help - Show this help message

Just send a command with a wallet address to get started!
        `;
        bot?.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /help command
    bot.onText(/\/help/, (msg) => {
        const helpMessage = `
📖 *TrackVerse Bot Commands*

/track \`0x...\` - Analyze wallet & find top 10 contacts
/history \`0x...\` - Get 10 recent transactions
/more \`0x...\` - Get 20 transactions (extended view)

*Tips:*
• Click any wallet address to track it
• Full addresses shown for easy copying

🌐 Web App: http://localhost:3000
        `;
        bot?.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    });

    // /track command - Analyze wallet contacts (shows 10 contacts)
    bot.onText(/\/track\s+(0x[a-fA-F0-9]{40})/, async (msg, match) => {
        if (!match) return;
        const address = match[1].toLowerCase();
        const chatIdLocal = msg.chat.id;

        bot?.sendMessage(chatIdLocal, `🔍 Analyzing wallet...\nPlease wait...`, { parse_mode: 'Markdown' });

        try {
            // Fetch outgoing (sent to)
            const sentTo = await alchemy.core.getAssetTransfers({
                fromAddress: address,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 50,
            });

            // Fetch incoming (received from)
            const receivedFrom = await alchemy.core.getAssetTransfers({
                toAddress: address,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 50,
            });

            // Aggregate contacts
            const contacts = new Map<string, { count: number; direction: string }>();

            sentTo.transfers.forEach(tx => {
                if (tx.to) {
                    const existing = contacts.get(tx.to) || { count: 0, direction: 'sent' };
                    existing.count++;
                    contacts.set(tx.to, existing);
                }
            });

            receivedFrom.transfers.forEach(tx => {
                if (tx.from) {
                    const existing = contacts.get(tx.from) || { count: 0, direction: 'received' };
                    existing.count++;
                    if (existing.direction === 'sent') existing.direction = 'both';
                    contacts.set(tx.from, existing);
                }
            });

            // Sort by count and get top 10
            const topContacts = Array.from(contacts.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10);

            let response = `📊 *Wallet Analysis Complete*\n\n`;
            response += `📍 *Wallet:*\n\`${address}\`\n\n`;
            response += `📤 Sent: ${sentTo.transfers.length} txs\n`;
            response += `📥 Received: ${receivedFrom.transfers.length} txs\n\n`;
            response += `👥 *Top 10 Contacts:*\n`;

            // Create inline keyboard with clickable wallet addresses
            const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

            // Different emojis for variety
            const emojiList = ['🔷', '🔶', '🟢', '🟡', '🔴', '🟣', '🟠', '🔵', '🟤', '⚫'];

            topContacts.forEach(([addr, data], i) => {
                const directionEmoji = data.direction === 'sent' ? '📤' : data.direction === 'received' ? '📥' : '🔄';
                const numberEmoji = emojiList[i] || '⭐';

                response += `\n${numberEmoji} ${directionEmoji} *${data.count} txs*\n\`${addr}\`\n`;

                // Add button for each contact
                keyboard.push([{
                    text: `🔍 Track This Wallet`,
                    callback_data: `track_${addr}`
                }]);
            });

            bot?.sendMessage(chatIdLocal, response, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });

        } catch (error: any) {
            console.error('Track error:', error);
            bot?.sendMessage(chatIdLocal, `❌ Error: ${error.message || 'Could not analyze wallet'}`, { parse_mode: 'Markdown' });
        }
    });

    // /history command - Get 10 recent transactions
    bot.onText(/\/history\s+(0x[a-fA-F0-9]{40})/, async (msg, match) => {
        if (!match) return;
        const address = match[1].toLowerCase();
        const chatIdLocal = msg.chat.id;

        await sendTransactionHistory(chatIdLocal, address, 10);
    });

    // /more command - Get 20 transactions (extended)
    bot.onText(/\/more\s+(0x[a-fA-F0-9]{40})/, async (msg, match) => {
        if (!match) return;
        const address = match[1].toLowerCase();
        const chatIdLocal = msg.chat.id;

        await sendTransactionHistory(chatIdLocal, address, 20);
    });

    // Handle callback queries (button clicks)
    bot.on('callback_query', async (query) => {
        if (!query.data || !query.message) return;

        if (query.data.startsWith('track_')) {
            const address = query.data.replace('track_', '');
            const chatIdLocal = query.message.chat.id;

            // Answer callback to remove loading state
            bot?.answerCallbackQuery(query.id, { text: 'Tracking wallet...' });

            // Trigger track command
            bot?.emit('text', {
                chat: { id: chatIdLocal },
                text: `/track ${address}`
            } as any);
        }

        if (query.data.startsWith('more_')) {
            const address = query.data.replace('more_', '');
            const chatIdLocal = query.message.chat.id;

            bot?.answerCallbackQuery(query.id, { text: 'Loading more...' });
            await sendTransactionHistory(chatIdLocal, address, 20);
        }
    });

    // Helper function to send transaction history
    async function sendTransactionHistory(chatIdLocal: number, address: string, limit: number) {
        bot?.sendMessage(chatIdLocal, `📜 Fetching ${limit} transactions...`, { parse_mode: 'Markdown' });

        try {
            const txLimit = Math.ceil(limit / 2);

            const [sent, received] = await Promise.all([
                alchemy.core.getAssetTransfers({
                    fromAddress: address,
                    category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                    maxCount: txLimit,
                    order: 'desc' as any,
                }),
                alchemy.core.getAssetTransfers({
                    toAddress: address,
                    category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                    maxCount: txLimit,
                    order: 'desc' as any,
                }),
            ]);

            let response = `📜 *Transaction History*\n\n`;
            response += `📍 *Wallet:*\n\`${address}\`\n\n`;

            // Show sent
            response += `📤 *Sent (${sent.transfers.length}):*\n`;
            if (sent.transfers.length === 0) {
                response += `_No sent transactions_\n`;
            } else {
                sent.transfers.slice(0, Math.ceil(limit / 2)).forEach(tx => {
                    response += `• ${tx.value?.toFixed(4) || '0'} ${tx.asset || 'ETH'}\n`;
                    response += `  → \`${tx.to}\`\n`;
                });
            }

            response += `\n📥 *Received (${received.transfers.length}):*\n`;
            if (received.transfers.length === 0) {
                response += `_No received transactions_\n`;
            } else {
                received.transfers.slice(0, Math.ceil(limit / 2)).forEach(tx => {
                    response += `• ${tx.value?.toFixed(4) || '0'} ${tx.asset || 'ETH'}\n`;
                    response += `  ← \`${tx.from}\`\n`;
                });
            }

            // Add "Load More" button if showing 10
            const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
            if (limit === 10) {
                keyboard.push([{
                    text: '📋 Load More (20 txs)',
                    callback_data: `more_${address}`
                }]);
            }

            bot?.sendMessage(chatIdLocal, response, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
            });

        } catch (error: any) {
            console.error('History error:', error);
            bot?.sendMessage(chatIdLocal, `❌ Error: ${error.message || 'Could not fetch history'}`, { parse_mode: 'Markdown' });
        }
    }

    // Handle invalid wallet address
    bot.onText(/\/(track|history|more)(?:\s+(.*))?$/, (msg, match) => {
        if (!match) return;
        const command = match[1];
        const input = match[2];

        if (!input || !input.startsWith('0x') || input.length !== 42) {
            bot?.sendMessage(msg.chat.id,
                `⚠️ Please provide a valid wallet address.\n\nExample:\n\`/${command} 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\``,
                { parse_mode: 'Markdown' }
            );
        }
    });
}

// Export sendAlert function for notifications
export async function sendAlert(message: string) {
    if (!bot || !chatId) {
        console.log('Telegram not configured, skipping alert:', message);
        return;
    }
    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Failed to send Telegram alert:', error);
    }
}

export { bot };
