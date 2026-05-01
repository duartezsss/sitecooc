export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        return res.status(200).end();
    }

    const API_TOKEN = 'sk_b504cdd4f59f4e89860d2d2a40ed1375b1ebb3ae6beca4de8833cb3bf441301c';
    const PRODUCT_HASH = 'prod_1f78c1869f949924';
    const PRODUCT_TITLE = 'Sonofix';
    const BASE_AMOUNT = 2403; // Using the value from the user's PHP script as base, or dynamically
    const PIX_EXPIRATION_MINUTES = 5;

    try {
        if (req.method === 'GET' && req.query.action === 'check_status') {
            const hash = req.query.hash;
            if (!hash) return res.status(400).json({ error: 'No hash provided' });

            const backendRes = await fetch(`https://multi.paradisepags.com/api/v1/check_status.php?hash=${hash}`, {
                method: 'GET',
                headers: {
                    'X-API-Key': API_TOKEN
                }
            });

            const data = await backendRes.json();
            
            // Replicate PHP logic
            if (backendRes.ok && data.payment_status === 'paid') {
                // mock logic for upsell URL if needed
                data.upsell_url = '';
            }

            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const customer_data = body.customer || {};
            const utms = body.utms || {};
            const checkout_url = body.checkoutUrl || '';

            // Use the amount from total if passed, else BASE_AMOUNT
            const rawAmount = body.total || BASE_AMOUNT;
            const amount = Math.round(rawAmount);

            const reference = 'POP-' + Date.now() + Math.floor(Math.random() * 1000);
            const clean_document = (customer_data.document || '').replace(/\D/g, '');
            const clean_phone = (customer_data.phone_number || '').replace(/\D/g, '');

            const payload = {
                amount: amount,
                description: PRODUCT_TITLE,
                reference: reference,
                checkoutUrl: checkout_url,
                productHash: PRODUCT_HASH,
                customer: {
                    name: customer_data.name || 'N/A',
                    email: customer_data.email || 'na@na.com',
                    document: clean_document,
                    phone: clean_phone
                }
            };

            if (Object.keys(utms).length > 0) {
                payload.tracking = {};
                for (const [key, value] of Object.entries(utms)) {
                    if (value) payload.tracking[key] = value;
                }
                if (Object.keys(payload.tracking).length === 0) {
                    delete payload.tracking;
                }
            }

            const backendRes = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-API-Key': API_TOKEN
                },
                body: JSON.stringify(payload)
            });

            const textResp = await backendRes.text();
            let response_data;
            try {
                response_data = JSON.parse(textResp);
            } catch(e) {
                return res.status(backendRes.status).send(textResp);
            }

            if (backendRes.ok && response_data) {
                const transaction_data = response_data.transaction || response_data;
                const frontend_response = {
                    hash: transaction_data.id || reference,
                    pix: {
                        pix_qr_code: transaction_data.qr_code || '',
                        expiration_date: transaction_data.expires_at || null
                    }
                };
                return res.status(backendRes.status).json(frontend_response);
            } else {
                return res.status(backendRes.status).json(response_data);
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch(e) {
        console.error("Vercel Proxy Execution Error:", e);
        return res.status(500).json({ error: e.message || 'Internal Error' });
    }
}
