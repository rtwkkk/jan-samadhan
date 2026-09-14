const axios = require('axios');
const crypto = require('crypto');
const VoiceCall = require('../models/VoiceCall');
const whatsappConversationService = require('../services/whatsapp/whatsappConversation.service');
const { sendEvidenceRequestEmail } = require('../services/emailService');

exports.triggerCall = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
    }

    // Format phone number to +91 format if it's just 10 digits
    let formattedPhone = phone.trim();
    if (formattedPhone.length === 10 && !formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    } else if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
      formattedPhone = '+' + formattedPhone;
    }

    const apiKey = process.env.SARVAM_API_KEY;
    const agentId = process.env.SARVAM_AGENT_ID;
    const agentPhoneNumber = process.env.SARVAM_PHONE_NUMBER;

    if (!apiKey || !agentId) {
      return res.status(500).json({ success: false, message: 'Sarvam AI credentials not configured in backend.' });
    }

    // Generate a unique lead ID to track the call
    const leadId = crypto.randomUUID();

    // The webhook URL should ideally be your public facing URL, but localhost is fine for testing if exposed via ngrok/cloudflare.
    // Assuming the user runs Cloudflare tunnel on port 5000 as task-228. We'll use a placeholder or local URL, they can update it.
    // Webhook needs to be public for Sarvam to hit it.
    const webhookUrl = 'https://jkr.loca.lt/api/sarvam/webhook'; // the user can modify this or we can dynamically construct it if we know the tunnel URL. Let's use a dummy for local testing or the actual domain if available.
    
    // Create the database record
    await VoiceCall.create({
      userName: name,
      userEmail: email,
      userPhone: formattedPhone,
      sarvamLeadId: leadId,
      status: 'initiated'
    });

    // Make the API request to Sarvam
    // Based on user's cURL request format
    const response = await axios.post(
      'https://apps.sarvam.ai/api/outbounds/v1/orgs/01a08570-1636-71cd-8c34-e1cf3237ae74/workspaces/01a08570-163f-7d1f-ac21-fd2c41eba26c/outbounds',
      {
        app_config: {
          app_id: agentId,
          app_version: 2,
          app_type: "agent",
          connection_config: {
            connection_id: "0f2f8620-c0-a096b1be-c30a",
            agent_phone_number: agentPhoneNumber || "+917971414024"
          },
          agent_variables: {
            user_name: name,
            citizen_phone: formattedPhone
          },
          app_overrides: {
            initial_bot_message: `Hello ${name}, this is Jagriti from Jan Samadhan. How can I help you today?`
          }
        },
        user_config: {
          user_phone_number: formattedPhone
        },
        webhook_config: {
          url: `${process.env.WEBHOOK_BASE_URL || 'https://jkr.loca.lt'}/api/sarvam/webhook`,
          metadata: {
            lead_id: leadId
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        }
      }
    );

    res.status(200).json({ success: true, message: 'Call initiated successfully.', data: response.data });
  } catch (error) {
    console.error('Sarvam AI Call Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to initiate call.', error: error.response?.data || error.message });
  }
};

exports.webhookHandler = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[Sarvam Webhook Received]:', JSON.stringify(payload, null, 2));

    const leadId = payload.metadata?.lead_id;
    if (!leadId) {
      return res.status(400).send('No lead_id provided');
    }

    const callDetails = payload.call_details || {};
    
    // Update the database record
    const updatedCall = await VoiceCall.findOneAndUpdate(
      { sarvamLeadId: leadId },
      {
        status: 'completed',
        callTranscript: callDetails.transcript || '',
        callSummary: callDetails.summary || '',
        disposition: callDetails.disposition || '',
        recordingUrl: callDetails.recording_url || ''
      },
      { new: true } // return updated doc
    );

    // If successfully saved and we have the phone number, initialize the WhatsApp CRM handoff!
    if (updatedCall && updatedCall.userPhone) {
      // The summary might be empty if Sarvam doesn't send it properly, 
      // so fallback to transcript or "General Query"
      let summary = updatedCall.callSummary || 'Not specified';
      if (!summary || summary === 'Not specified') {
         // Attempt to extract the first few words of the transcript if summary is missing
         summary = updatedCall.callTranscript ? (updatedCall.callTranscript.substring(0, 100) + '...') : 'Not specified';
      }

      await whatsappConversationService.initializeVoiceCallHandoff(updatedCall.userPhone, {
        userName: updatedCall.userName,
        userEmail: updatedCall.userEmail,
        callSummary: summary
      });

      // Send evidence request email (non-blocking)
      if (updatedCall.userEmail) {
        sendEvidenceRequestEmail(updatedCall.userEmail, updatedCall.userName, updatedCall.sarvamLeadId);
      }
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Sarvam Webhook Error:', error);
    res.status(500).send('Internal Error');
  }
};
