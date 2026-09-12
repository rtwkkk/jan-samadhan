import { MessageRepository } from '@/lib/mongodb/repositories/MessageRepository';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';
import { GroqProvider } from './groq-provider';
import { ChatMessage } from './provider';
import { detectIntent } from './intent-classifier';
import { handleComplaintRegistrationFlow } from './complaint-registration-flow';
import { handleComplaintStatusFlow } from './complaint-status-flow';
import { handleOtherHelpFlow } from './other-help-flow';



const MENU_TEXT = `Namaskar! Citizen Service Portal mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?

1. Register Complaint (Nayi shikayat darj karein)
2. Check Complaint Status (Apni shikayat ki sthiti dekhein)
3. Other Help (Anya madad)

Kripya 1, 2, ya 3 reply karein.`;

export async function handleAiConversation(
  accountId: string,
  conversationId: string,
  userMessage: string,
  senderPhone: string
) {
  try {
    const aiProvider = new GroqProvider();

    if (!userMessage || !userMessage.trim()) {
      return;
    }

    const history = await MessageRepository.findManyWithCursor(accountId, conversationId, 15, null);
    const chronologicalHistory = history.reverse();

    const messages: ChatMessage[] = [];
    for (const msg of chronologicalHistory) {
      if (!msg.contentText) continue;
      const role = msg.senderType === 'customer' ? 'user' : 'assistant';
      messages.push({ role, content: msg.contentText });
    }

    // Deterministic menu routing if we are in the main menu or a fresh start
    const userMessageLower = userMessage.trim().toLowerCase();
    
    // Check if the last assistant message was the menu
    const lastAssistantMsgFallback = messages.slice().reverse().find(m => m.role === 'assistant')?.content || '';
    const isMenuShowing = !lastAssistantMsgFallback || lastAssistantMsgFallback.includes('Nayi shikayat darj karein');
    const isAskingForStatus = lastAssistantMsgFallback.includes('Complaint ID bhejiye') || lastAssistantMsgFallback.includes('doosra Complaint ID bhejein') || lastAssistantMsgFallback.includes('dobara bhejiye');
    const isInOtherHelp = lastAssistantMsgFallback.includes('4 se 8 mein se');
    const isInRegistration = !isMenuShowing && !isAskingForStatus && !isInOtherHelp && lastAssistantMsgFallback.length > 0;

    let intent: string | null = 'UNKNOWN';
    
    if (isMenuShowing) {
      if (/^1\.?$/.test(userMessageLower) || ['register complaint', 'register', '01', '1'].includes(userMessageLower)) {
        intent = 'REGISTER_COMPLAINT';
      } else if (/^2\.?$/.test(userMessageLower) || ['check status', 'status', '02', '2'].includes(userMessageLower)) {
        intent = 'CHECK_STATUS';
      } else if (/^3\.?$/.test(userMessageLower) || ['other help', 'help', '03', '3'].includes(userMessageLower)) {
        intent = 'OTHER_HELP';
      } else {
        intent = await detectIntent(aiProvider, messages, userMessage);
      }
    } else if (isInOtherHelp && /^(4|5|6|7|8|04|05|06|07|08)\.?$/.test(userMessageLower)) {
      // Deterministic routing for Other Help options to prevent them falling through to intent classifier
      intent = 'OTHER_HELP_RESPONSE';
    } else {
      // If we are deep inside a flow, do not aggressively match "1" as the menu item, 
      // but still allow natural language routing.
      intent = await detectIntent(aiProvider, messages, userMessage);
    }
    
    let replyText = '';

    if (intent === null) {
      replyText = "Sorry ji, abhi thodi technical problem aa rahi hai. Ek baar phir se bataiye.";
    } else {
      switch (intent) {
      case 'GREETING':
        replyText = MENU_TEXT;
        break;
      case 'REGISTER_COMPLAINT':
        replyText = await handleComplaintRegistrationFlow(aiProvider, accountId, messages, senderPhone);
        break;
      case 'CHECK_STATUS':
        replyText = await handleComplaintStatusFlow(accountId, userMessage);
        break;
      case 'OTHER_HELP':
        replyText = await handleOtherHelpFlow(userMessage, true);
        break;
      case 'OTHER_HELP_RESPONSE':
        replyText = await handleOtherHelpFlow(userMessage, false);
        break;
      case 'UNKNOWN':
      default:
        // Try the complaint flow if we are already deeply inside a complaint registration session.
        // If the user's intent is UNKNOWN (e.g. they just answered a question like "Ranchi"),
        // the intent classifier might output UNKNOWN because it's not a clear menu command.
        // Let's pass it to the complaint flow just in case!
        // Actually, a better approach: if the last message from the assistant was a complaint question,
        // we should route to REGISTER_COMPLAINT.
        
        // State variables are now evaluated before intent classification.

        if (isAskingForStatus) {
          replyText = await handleComplaintStatusFlow(accountId, userMessage);
        } else if (isInOtherHelp) {
          replyText = await handleOtherHelpFlow(userMessage, false);
        } else if (isInRegistration) {
          replyText = await handleComplaintRegistrationFlow(aiProvider, accountId, messages, senderPhone);
        } else {
          replyText = "Maaf karna, mujhe theek se samajh nahi aaya. " + MENU_TEXT;
        }
        break;
      }
    }

    await sendMessageToConversation(accountId, {
      conversationId,
      messageType: 'text',
      contentText: replyText
    });

  } catch (err) {
    console.error('[AI Handler] Unhandled error during AI conversation:', err);
  }
}
