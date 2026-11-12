module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const domain = (body.domain || body['Store Domain'] || '').trim();
    const role = (body.role || body['User Role'] || '').trim();
    const volume = (body.volume || body['Monthly Orders'] || '').trim();
    const contact = (body.contact || body['Business Contact'] || '').trim();

    if (!domain || !contact) {
      return res.status(400).json({ error: 'Store domain and business contact are required.' });
    }

    const payload = {
      _subject: `[Coverdo Evaluation] ${domain} (${volume || 'New Lead'})`,
      _template: 'table',
      _captcha: 'false',
      'Store Domain': domain,
      'User Role': role || 'Founder / Operator',
      'Monthly Orders': volume || 'Not specified',
      'Business Contact': contact,
      'Submitted At (IST)': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      'Source': req.headers['referer'] || 'https://coverdo.in/#intake'
    };

    if (contact.includes('@')) {
      payload._replyto = contact.trim();
    }

    const fsRes = await fetch('https://formsubmit.co/ajax/growth@coverdo.in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://coverdo.in',
        'Referer': 'https://coverdo.in/'
      },
      body: JSON.stringify(payload)
    });

    const fsData = await fsRes.json().catch(() => ({}));

    return res.status(200).json({
      success: true,
      message: 'Evaluation request dispatched to growth@coverdo.in',
      details: fsData
    });
  } catch (error) {
    console.error('API intake error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      mailto: 'mailto:growth@coverdo.in?subject=Coverdo%20Evaluation%20Request'
    });
  }
};
