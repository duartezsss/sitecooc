export default async function handler(req, res) {
    // Hardcoded Values
    const API_TOKEN = 'sk_b504cdd4f59f4e89860d2d2a40ed1375b1ebb3ae6beca4de8833cb3bf441301c';
    const PRODUCT_HASH = 'prod_1f78c1869f949924';

    try {
        if (req.method === 'GET' && req.query.action === 'check_status') {
            const hash = req.query.hash;
            if (!hash) {
                return res.status(400).json({ success: false, error: 'Hash missing' });
            }

            const backendRes = await fetch(`https://multi.paradisepags.com/api/v1/check_status.php?hash=${hash}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`
                }
            });

            const data = await backendRes.json();
            return res.status(200).json({ success: true, status: data.status || 'pending' });
        } 
        
        if (req.method === 'POST') {
            const body = req.body;
            
            if (!body) {
                return res.status(400).json({ success: false, error: 'Invalid payload' });
            }

            const customer = body.customer || {};
            
            const apiPayload = {
                product_hash: PRODUCT_HASH,
                customer: customer,
                utms: body.utms || {}
            };
            
            if (body.total) apiPayload.total = body.total;
            if (body.offer) apiPayload.offer = body.offer;

            const backendRes = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`
                },
                body: JSON.stringify(apiPayload)
            });

            const decoded = await backendRes.json();

            if (backendRes.ok && decoded) {
                // Get the first item if array, or just use decoded object
                const firstItem = Array.isArray(decoded) ? decoded[0] : decoded;
                
                return res.status(200).json({
                    success: true,
                    hash: firstItem.hash || null,
                    pix: decoded
                });
            }

            return res.status(400).json({
                success: false,
                error: decoded.error || decoded.message || 'Failed from Gateway'
            });
        }

        return res.status(405).json({ success: false, error: 'Method not supported' });
    } catch (e) {
        console.error("Vercel Proxy Error:", e);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
