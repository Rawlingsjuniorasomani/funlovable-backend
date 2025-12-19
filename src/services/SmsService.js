const axios = require('axios');

class SmsService {
  static normalizePhone(phone) {
    if (!phone) return null;
    const raw = String(phone).replace(/\s+/g, '').replace(/-/g, '');
    if (raw.startsWith('+')) return raw.slice(1);
    if (raw.startsWith('0') && raw.length === 10) return `233${raw.slice(1)}`;
    if (raw.startsWith('233')) return raw;
    return raw;
  }

  static async sendSMS({ recipients, message, sender }) {
    const apiKey = process.env.ARKESEL_API_KEY;
    if (!apiKey) {
      throw new Error('ARKESEL_API_KEY is not configured');
    }

    const resolvedSender = sender || process.env.ARKESEL_SENDER_ID || 'EduLearn';

    const normalized = (Array.isArray(recipients) ? recipients : [recipients])
      .map((r) => SmsService.normalizePhone(r))
      .filter(Boolean);

    if (normalized.length === 0) {
      throw new Error('No valid recipients');
    }

    const payload = {
      sender: resolvedSender,
      message,
      recipients: normalized,
    };

    const res = await axios.post('https://sms.arkesel.com/api/v2/sms/send', payload, {
      headers: {
        'api-key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return res.data;
  }

  static async sendWelcomeSMS({ phone, name, role }) {
    const who = name || 'there';
    const roleLabel = role ? ` (${role})` : '';
    const message = `Welcome ${who}${roleLabel}! Your account has been created successfully. Login and start learning.`;
    return SmsService.sendSMS({ recipients: phone, message });
  }
}

module.exports = SmsService;
