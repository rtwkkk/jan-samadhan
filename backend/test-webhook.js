const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: '../backend/.env' });

const baseUrl = 'http://localhost:5000/api/whatsapp/webhook';

async function testWebhook() {
  console.log('--- Testing Verification Handshake (GET) ---');
  try {
    const res = await axios.get(baseUrl, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN,
        'hub.challenge': '123456789'
      }
    });
    console.log('✅ Handshake successful. Challenge response:', res.data);
  } catch (err) {
    console.error('❌ Handshake failed:', err.response?.data || err.message);
  }

  console.log('\n--- Testing Incoming Message (POST) ---');
  
  // Create a mock Meta WhatsApp webhook payload
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
              },
              contacts: [
                {
                  profile: { name: 'Test Citizen' },
                  wa_id: '919876543210'
                }
              ],
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.HBgLOTE5ODc2NTQzMjEwFQIAEhgUM0VCRjEwODNDOTQwQTQ0NjA2OUEA',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: 'hi' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const rawBody = JSON.stringify(payload);
  const appSecret = process.env.META_APP_SECRET;

  // Generate the HMAC signature using the exact raw body string
  const signature = 'sha256=' + crypto.createHmac('sha256', appSecret)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('hex');

  try {
    const res = await axios.post(baseUrl, rawBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature
      }
    });
    console.log('✅ Message POST successful. Response status:', res.status);
  } catch (err) {
    console.error('❌ Message POST failed:', err.response?.data || err.message);
  }
}

testWebhook();
