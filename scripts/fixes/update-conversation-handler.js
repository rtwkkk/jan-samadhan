const fs = require('fs');
const file = 'src/lib/ai/conversation-handler.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the intent detection logic
const oldLogic = `    // Determine Intent (use up to 5 recent messages for context)
    const intent = await detectIntent(aiProvider, messages, userMessage);`;

const newLogic = `    // Deterministic menu routing if we are in the main menu or a fresh start
    const userMessageLower = userMessage.trim().toLowerCase();
    
    // Check if the last assistant message was the menu
    const lastAssistantMsg = messages.slice().reverse().find(m => m.role === 'assistant')?.content || '';
    const isMenuShowing = !lastAssistantMsg || lastAssistantMsg.includes('Nayi shikayat darj karein');

    let intent = 'UNKNOWN';
    
    if (isMenuShowing) {
      if (/^1\\.?$/.test(userMessageLower) || ['register complaint', 'register', '01', '1'].includes(userMessageLower)) {
        intent = 'REGISTER_COMPLAINT';
      } else if (/^2\\.?$/.test(userMessageLower) || ['check status', 'status', '02', '2'].includes(userMessageLower)) {
        intent = 'CHECK_STATUS';
      } else if (/^3\\.?$/.test(userMessageLower) || ['other help', 'help', '03', '3'].includes(userMessageLower)) {
        intent = 'OTHER_HELP';
      } else {
        intent = await detectIntent(aiProvider, messages, userMessage);
      }
    } else {
      // If we are deep inside a flow, do not aggressively match "1" as the menu item, 
      // but still allow natural language routing.
      intent = await detectIntent(aiProvider, messages, userMessage);
    }`;

code = code.replace(oldLogic, newLogic);

const oldUnknownLogic = `        // Let's check the history.
        const lastAssistantMsg = messages.slice().reverse().find(m => m.role === 'assistant')?.content || '';
        
        const isInRegistration = lastAssistantMsg.includes('register a complaint') || 
                                 lastAssistantMsg.includes('What is your full name') ||
                                 lastAssistantMsg.includes('type of issue') ||
                                 lastAssistantMsg.includes('description of the problem') ||
                                 lastAssistantMsg.includes('district') ||
                                 lastAssistantMsg.includes('village, city, or block') ||
                                 lastAssistantMsg.includes('Please confirm your complaint details');`;

const newUnknownLogic = `        const lastAssistantMsgFallback = messages.slice().reverse().find(m => m.role === 'assistant')?.content || '';
        
        // If the last message was NOT the menu, we assume we are answering a flow question.
        const isMenu = lastAssistantMsgFallback.includes('Nayi shikayat darj karein');
        const isInRegistration = !isMenu && lastAssistantMsgFallback.length > 0;`;

code = code.replace(oldUnknownLogic, newUnknownLogic);

fs.writeFileSync(file, code);
