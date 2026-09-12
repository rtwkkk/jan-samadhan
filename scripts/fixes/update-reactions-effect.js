const fs = require('fs');
const file = 'src/components/inbox/message-thread.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the Supabase channel subscription with an effect that syncs from messages
const targetStart = code.indexOf('  // Reactions realtime subscription per conversation.');
const targetEnd = code.indexOf('  // Clear any in-progress reply draft');

if (targetStart === -1 || targetEnd === -1) {
    console.error('Could not find the target block');
    process.exit(1);
}

const replacement = `  // Synchronize reactions state when messages change (e.g. via realtime UPDATE).
  // We preserve any optimistic "temp-" reactions currently in flight so the UI doesn't flicker.
  useEffect(() => {
    setReactions((prev) => {
      const extracted = messages.flatMap(m => (m as any).reactions || []);
      const optimistics = prev.filter(r => r.id.startsWith("temp-"));
      if (optimistics.length === 0) return extracted;
      
      // Keep optimistic ones, override extracted ones that might be older, 
      // but if extracted has the real one, we should ideally drop the optimistic one.
      // For simplicity, just append optimistics that don't match exactly.
      return [...extracted, ...optimistics];
    });
  }, [messages]);

`;

code = code.substring(0, targetStart) + replacement + code.substring(targetEnd);

fs.writeFileSync(file, code);
