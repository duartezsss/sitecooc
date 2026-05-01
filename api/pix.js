export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const token = process.env.PIX_API_TOKEN;
        const body = req.body;

        if (!token) {
            // Emulate for testing when no token
            return res.status(200).json({
                success: true,
                pix: {
                    qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                    qr_code: "00020126580014br.gov.bcb.pixmocked-code1234",
                    hash: "mock_" + Date.now(),
                    expires_in: 5
                }
            });
        }

        const backendRes = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_hash: "prod_1f78c1869f949924",
                customer: body.customer,
                offer: body.offer,
                total: body.total,
                utms: body.utms
            })
        });

        const data = await backendRes.json();
        
        if (data && data.qr_code) {
            return res.status(200).json({ success: true, pix: data });
        }

        return res.status(400).json({ success: false, error: "Failed from Gateway" });
    } catch (e) {
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}
