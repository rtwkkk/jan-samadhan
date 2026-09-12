const fs = require('fs');

let tb = fs.readFileSync('src/lib/whatsapp/template-body.ts', 'utf8');

// Extract the purely string manipulation functions: renderTemplateBody, templateBodyParams, templateContentText
const renderFile = `
export function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\\{\\{(\\d+)\\}\\}/g, (_, raw) => {
    const idx = Number(raw) - 1;
    return params[idx] ?? \`\\{\\{\${raw}\\}\\}\`;
  });
}

export function templateBodyParams(
  templateParams?: string[] | null,
  templateMessageParams?: unknown
): string[] {
  const structured =
    templateMessageParams &&
    typeof templateMessageParams === 'object' &&
    Array.isArray((templateMessageParams as { body?: unknown }).body)
      ? ((templateMessageParams as { body: unknown[] }).body.filter(
          (v): v is string => typeof v === 'string'
        ) as string[])
      : null;

  if (structured && structured.length > 0) return structured;
  return Array.isArray(templateParams) ? templateParams : [];
}

export function templateContentText(
  row: { body_text: string } | null,
  params: string[],
  composerPreRendered?: string | null
): string | null {
  if (composerPreRendered) return composerPreRendered;
  if (!row) return null;
  return renderTemplateBody(row.body_text, params);
}
`;
fs.writeFileSync('src/lib/whatsapp/template-body-render.ts', renderFile);

// Remove them from template-body.ts
tb = tb.replace(/export function renderTemplateBody[\s\S]*?\}\n\nexport function templateBodyParams[\s\S]*?\}\n\n/g, '');
tb = tb.replace(/export function templateContentText[\s\S]*?\}\n/g, '');

// import them in template-body.ts if needed? It's not using them! Wait, resolveTemplateRow doesn't use them. 
// Oh wait, send-message.ts uses them. Let's export them from template-body.ts just in case, but using `export * from './template-body-render'`.
// But wait, if we export them from template-body.ts, importing them from template-body.ts will still bundle mongoose!
// So we must change the imports in other files.

fs.writeFileSync('src/lib/whatsapp/template-body.ts', tb);

// Fix message-thread.tsx
let mt = fs.readFileSync('src/components/inbox/message-thread.tsx', 'utf8');
mt = mt.replace(/from "@\/lib\/whatsapp\/template-body"/g, 'from "@/lib/whatsapp/template-body-render"');
fs.writeFileSync('src/components/inbox/message-thread.tsx', mt);

// Fix send-message.ts
let sm = fs.readFileSync('src/lib/whatsapp/send-message.ts', 'utf8');
sm = sm.replace(/renderTemplateBody,/g, '');
sm = sm.replace(/templateBodyParams,/g, '');
sm = sm.replace(/templateContentText,/g, '');
sm = `import { renderTemplateBody, templateBodyParams, templateContentText } from '@/lib/whatsapp/template-body-render';\n` + sm;
fs.writeFileSync('src/lib/whatsapp/send-message.ts', sm);

// Fix template-body.test.ts
let test = fs.readFileSync('src/lib/whatsapp/template-body.test.ts', 'utf8');
test = test.replace(/renderTemplateBody,/g, '');
test = test.replace(/templateBodyParams,/g, '');
test = test.replace(/templateContentText,/g, '');
test = `import { renderTemplateBody, templateBodyParams, templateContentText } from './template-body-render';\n` + test;
fs.writeFileSync('src/lib/whatsapp/template-body.test.ts', test);
