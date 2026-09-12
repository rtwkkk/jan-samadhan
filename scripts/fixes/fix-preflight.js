const fs = require('fs');
let code = fs.readFileSync('src/lib/mongodb/migration/preflight.ts', 'utf8');

code = code.replace(
  /const \{ count: usersCount \} = await supabase.from\('auth\.users'\)\.select\('id', \{ count: 'exact', head: true \}\)\.catch\(\(\) => \(\{count: 'N\/A \(Schema restricted\)'\}\)\);/,
  "let usersCount: any = 'N/A (Schema restricted)';\n  try {\n    const res = await supabase.from('auth.users').select('id', { count: 'exact', head: true });\n    if (res.count !== null) usersCount = res.count;\n  } catch (e) {}"
);

code = code.replace(
  /const \{ count: reactCount \} = await supabase.from\('message_reactions'\)\.select\('id', \{ count: 'exact', head: true \}\)\.catch\(\(\) => \(\{count: 0\}\)\);/,
  "let reactCount: any = 0;\n  try {\n    const res = await supabase.from('message_reactions').select('id', { count: 'exact', head: true });\n    if (res.count !== null) reactCount = res.count;\n  } catch (e) {}"
);

fs.writeFileSync('src/lib/mongodb/migration/preflight.ts', code);
