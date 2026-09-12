const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/params: \{([^}]+)\}/g, "params: Promise.resolve({$1})");
  fs.writeFileSync(path, content);
}

fix('src/app/api/deals/[id]/route.test.ts');
fix('src/app/api/pipelines/[id]/route.test.ts');
fix('src/app/api/pipelines/[id]/stages/[stageId]/route.test.ts');
fix('src/app/api/pipelines/[id]/stages/route.test.ts');
