export default async function handler(req, res) {
    // Proxy request from Vercel/Node into the PHP file 
    // This is useful if the site is deployed simultaneously on PHP servers and serverless
    try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers['host'];
        
        let url = `${protocol}://${host}/pix-proxy.php`;
        
        if (req.method === 'GET' && req.query.action === 'check_status') {
            url += `?action=check_status&hash=${req.query.hash}`;
            const phpRes = await fetch(url);
            const data = await phpRes.json();
            return res.status(phpRes.status).json(data);
        } else if (req.method === 'POST') {
            const phpRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            const data = await phpRes.json();
            return res.status(phpRes.status).json(data);
        }
        
        res.status(405).json({ success: false, error: 'Method not supported' });
    } catch (e) {
        console.error("Proxy error:", e);
        res.status(500).json({ success: false, error: 'Proxy failed to reach pix-proxy.php' });
    }
}
