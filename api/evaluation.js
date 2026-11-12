const nodemailer = require('nodemailer');

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

    const timestampIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Method 1: Direct authenticated SMTP if SMTP_PASS is configured in Vercel env
    if (process.env.SMTP_PASS) {
      try {
        const smtpHost = process.env.SMTP_HOST || 'smtpout.secureserver.net';
        const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
        const smtpUser = process.env.SMTP_USER || 'growth@coverdo.in';

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `"Coverdo Intake" <${smtpUser}>`,
          to: 'growth@coverdo.in',
          replyTo: contact.includes('@') ? contact : undefined,
          subject: `[Coverdo Evaluation] ${domain} (${volume || 'New Lead'})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #021a0d; margin-top: 0;">New Store Evaluation Request</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Store Domain:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${domain}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">User Role:</td><td style="padding: 8px 0; color: #111827;">${role || 'Founder / Operator'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Monthly Volume:</td><td style="padding: 8px 0; color: #111827;">${volume || 'Not specified'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Business Contact:</td><td style="padding: 8px 0; font-weight: 600; color: #059669;">${contact}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Submitted At:</td><td style="padding: 8px 0; color: #111827;">${timestampIST} (IST)</td></tr>
              </table>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                Dispatched by Coverdo Production Pipeline · SLA: 30 business minutes
              </div>
            </div>
          `
        });

        return res.status(200).json({
          success: true,
          method: 'smtp',
          message: 'Evaluation request dispatched to growth@coverdo.in'
        });
      } catch (smtpErr) {
        console.error('SMTP dispatch failed, falling back to FormSubmit relay:', smtpErr);
      }
    }

    // Method 2: FormSubmit relay
    const payload = {
      _subject: `[Coverdo Evaluation] ${domain} (${volume || 'New Lead'})`,
      _template: 'table',
      _captcha: 'false',
      'Store Domain': domain,
      'User Role': role || 'Founder / Operator',
      'Monthly Orders': volume || 'Not specified',
      'Business Contact': contact,
      'Submitted At (IST)': timestampIST,
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

    // FormSubmit returns {"success":"false","message":"This form needs Activation..."} if unactivated
    if (fsData.success === false || fsData.success === 'false') {
      const isActivation = (fsData.message || '').toLowerCase().includes('activation');
      return res.status(200).json({
        success: false,
        activationRequired: isActivation,
        message: fsData.message || 'FormSubmit activation required',
        details: fsData
      });
    }

    return res.status(200).json({
      success: true,
      method: 'formsubmit',
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
