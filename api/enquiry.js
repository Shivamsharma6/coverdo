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
    const name = (body.name || body.Name || '').trim();
    const email = (body.email || body.workEmail || body.contact || '').trim();
    const website = (body.website || body.brand || body.domain || '').trim();
    const service = (body.service || body.serviceName || 'Help me identify the right scope').trim();
    const problem = (body.problem || body.message || body.notes || '').trim();

    if (!email || !problem) {
      return res.status(400).json({ error: 'Work email and brief description are required.' });
    }

    const timestampIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const emailSubject = `[Coverdo Enquiry] ${website || name || 'New Lead'} — ${service}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; padding: 28px; border: 1px solid #d8d9ce; border-radius: 6px; background-color: #f5f3eb; color: #242721;">
        <div style="border-bottom: 2px solid #f35831; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #17372c; font-size: 22px; font-weight: 700;">New Coverdo Scope & Enquiry Brief</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7066;">Submitted via coverdo.in enquiry form</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.5;">
          <tr>
            <td style="padding: 10px 0; color: #6b7066; width: 140px; font-weight: 600;">Contact Name:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #242721;">${name || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7066; font-weight: 600;">Work Email:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #f35831;">
              <a href="mailto:${email}" style="color: #f35831; text-decoration: underline;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7066; font-weight: 600;">Brand / Website:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #17372c;">${website || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7066; font-weight: 600;">Selected Service:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #17372c;">
              <span style="background: #e8ebe1; padding: 4px 8px; border-radius: 4px; display: inline-block;">${service}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 0 6px; color: #6b7066; font-weight: 600; vertical-align: top;" colspan="2">
              What Needs To Work Better:
            </td>
          </tr>
          <tr>
            <td colspan="2" style="background: #ffffff; border: 1px solid #d8d9ce; border-radius: 4px; padding: 14px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #242721;">${problem}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0 0; color: #6b7066; font-size: 12px;">Submitted At:</td>
            <td style="padding: 14px 0 0; color: #6b7066; font-size: 12px;">${timestampIST} (IST)</td>
          </tr>
        </table>

        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #d8d9ce; font-size: 12px; color: #6b7066; display: flex; justify-content: space-between;">
          <span>Coverdo Inbound Enquiry Desk</span>
          <span>Reply-To: ${email}</span>
        </div>
      </div>
    `;

    // 1. Direct authenticated GoDaddy SMTP
    if (process.env.SMTP_PASS) {
      const smtpHost = (process.env.SMTP_HOST || 'smtpout.secureserver.net').trim();
      const smtpUser = (process.env.SMTP_USER || 'growth@coverdo.in').trim();
      const smtpPass = process.env.SMTP_PASS.trim();
      const preferredPort = parseInt(process.env.SMTP_PORT || '465', 10);

      const portsToTry = preferredPort === 465 ? [465, 587] : [preferredPort, 465];
      let lastSmtpError = null;

      for (const port of portsToTry) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: port,
            secure: port === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            connectionTimeout: 8000,
            greetingTimeout: 5000,
            socketTimeout: 10000
          });

          await transporter.sendMail({
            from: `"Coverdo Inbound" <${smtpUser}>`,
            to: 'growth@coverdo.in',
            replyTo: email,
            subject: emailSubject,
            html: emailHtml
          });

          return res.status(200).json({
            success: true,
            method: 'smtp',
            port: port,
            message: 'Enquiry received and dispatched to growth@coverdo.in via GoDaddy SMTP'
          });
        } catch (err) {
          lastSmtpError = err;
          console.warn(`GoDaddy SMTP port ${port} attempt failed:`, err.message);
        }
      }

      console.error('All GoDaddy SMTP ports failed:', lastSmtpError);
      return res.status(500).json({
        success: false,
        error: `SMTP delivery error: ${lastSmtpError?.message || 'Authentication or connection failed'}`,
        mailto: `mailto:growth@coverdo.in?subject=${encodeURIComponent(emailSubject)}`
      });
    }

    // 2. Resend API fallback if configured
    if (process.env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || 'Coverdo <onboarding@resend.dev>',
            to: ['growth@coverdo.in'],
            reply_to: email,
            subject: emailSubject,
            html: emailHtml
          })
        });

        if (resendRes.ok) {
          return res.status(200).json({
            success: true,
            method: 'resend',
            message: 'Enquiry received and dispatched to growth@coverdo.in via Resend'
          });
        }
      } catch (resendErr) {
        console.error('Resend dispatch failed:', resendErr);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'SMTP_PASS environment variable is not configured',
      mailto: `mailto:growth@coverdo.in?subject=${encodeURIComponent(emailSubject)}`
    });
  } catch (error) {
    console.error('Enquiry API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      mailto: 'mailto:growth@coverdo.in?subject=Coverdo%20Enquiry'
    });
  }
};
