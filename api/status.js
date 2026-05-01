export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const hash = req.query.hash;
        const token = process.env.PIX_API_TOKEN;

        if (!hash) {
            return res.status(400).json({ success: false, error: 'Missing hash' });
        }

        if (!token || hash.startsWith('mock_')) {
            // Mock randomly paid for demonstration
            const isPaid = Math.random() > 0.7;
            return res.status(200).json({ success: true, status: isPaid ? 'paid' : 'pending' });
        }

        const backendRes = await fetch(`https://multi.paradisepags.com/api/v1/check_status.php?hash=${hash}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await backendRes.json();
        return res.status(200).json({ success: true, status: data.status });
    } catch(e) {
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
