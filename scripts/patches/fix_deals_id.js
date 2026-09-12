const fs = require('fs');
let content = fs.readFileSync('src/app/api/deals/[id]/route.ts', 'utf8');

// Replace PATCH params.id
content = content.replace(/export async function PATCH\([\s\S]*?\)\s*\{[\s\S]*?try \{/, (match) => {
  return match + '\n    const { id } = await params;';
});

content = content.replace(/export async function DELETE\([\s\S]*?\)\s*\{[\s\S]*?try \{/, (match) => {
  return match + '\n    const { id } = await params;';
});

content = content.replace(/params\.id/g, 'id');

fs.writeFileSync('src/app/api/deals/[id]/route.ts', content);
