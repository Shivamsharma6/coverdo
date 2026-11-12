const enquiryHandler = require('./enquiry.js');

module.exports = async function handler(req, res) {
  // Normalize legacy evaluation fields if passed
  if (req.body && typeof req.body === 'object') {
    if (!req.body.website && req.body.domain) req.body.website = req.body.domain;
    if (!req.body.email && req.body.contact && req.body.contact.includes('@')) req.body.email = req.body.contact;
    if (!req.body.problem) {
      const parts = [];
      if (req.body.role) parts.push(`Role: ${req.body.role}`);
      if (req.body.volume) parts.push(`Volume: ${req.body.volume}`);
      if (req.body.contact) parts.push(`Contact: ${req.body.contact}`);
      req.body.problem = parts.join(' · ') || 'Store Evaluation Request';
    }
  }
  return enquiryHandler(req, res);
};
