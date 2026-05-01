export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const token = process.env.PIX_API_TOKEN;
        const body = req.body;

        if (!token) {
            return res.status(401).json({ success: false, error: 'Token PIX_API_TOKEN is missing from environment.' });
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
        console.log("[PIX API] Gateway response:", data);
        
        if (backendRes.ok && data) {
            return res.status(200).json({ success: true, pix: data });
        }

        return res.status(400).json({ success: false, error: data.error || data.message || "Failed from Gateway" });
    } catch (e) {
        console.error("[PIX API] Execution Error:", e);
        return res.status(500).json({ success: false, error: "Internal Server Error (" + e.message + ")" });
    }
}
