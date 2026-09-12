const fs = require('fs');
let code = fs.readFileSync('src/lib/dashboard/queries.ts', 'utf8');

// The original line: const [msgs, contacts, deals, broadcasts, autoLogs] = await Promise.all([...])
// We need to remove the queries for broadcasts and autoLogs.
code = code.replace(/const \[msgs, contacts, deals, broadcasts, autoLogs\] = await Promise\.all\(\[/g, 'const [msgs, contacts, deals] = await Promise.all([');
code = code.replace(/,\n\s*supabase\n\s*\.from\('broadcasts'\)[\s\S]*?\.limit\(5\),\n\s*supabase\n\s*\.from\('automation_logs'\)[\s\S]*?\.limit\(5\)\n\s*\]\)/g, '\n  ])');

// Then there's the loop parsing them: `for (const b of (broadcasts.data ?? []) as Array<{...}>) {`
code = code.replace(/for \(const b of \(broadcasts\.data \?\? \[\]\) as Array<\{[\s\S]*?\}\>\) \{[\s\S]*?\}\n/g, '');
// And `for (const a of (autoLogs.data ?? []) as Array<{...}>) {`
code = code.replace(/for \(const a of \(autoLogs\.data \?\? \[\]\) as Array<\{[\s\S]*?\}\>\) \{[\s\S]*?\}\n/g, '');

fs.writeFileSync('src/lib/dashboard/queries.ts', code);
