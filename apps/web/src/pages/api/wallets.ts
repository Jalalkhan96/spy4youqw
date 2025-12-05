import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
        return res.json(data);

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
