const fs = require('fs');

function fixFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace { params }: { params: { id: string } }
  // with { params }: { params: Promise<{ id: string }> }
  content = content.replace(/\{ params \}: \{ params: \{ id: string;? \} \}/g, '{ params }: { params: Promise<{ id: string }> }');
  
  // Replace { params }: { params: { id: string; stageId: string; } }
  // with { params }: { params: Promise<{ id: string; stageId: string }> }
  content = content.replace(/\{ params \}: \{ params: \{ id: string;\s*stageId: string;? \} \}/g, '{ params }: { params: Promise<{ id: string; stageId: string }> }');

  // Add await before params
  content = content.replace(/const (dealId|pipelineId|noteId|notificationId) = params\.id/g, (match, p1) => {
    return `const { id: ${p1} } = await params`;
  });
  
  content = content.replace(/const \{ id: ([^ }]+) \} = params/g, 'const { id: $1 } = await params');
  content = content.replace(/const \{ id, stageId \} = params/g, 'const { id, stageId } = await params');
  content = content.replace(/params\.id/g, '(await params).id');
  content = content.replace(/params\.stageId/g, '(await params).stageId');

  fs.writeFileSync(path, content);
}

fixFile('src/app/api/notes/[id]/route.ts');
fixFile('src/app/api/notifications/[id]/route.ts');
fixFile('src/app/api/pipelines/[id]/route.ts');
fixFile('src/app/api/pipelines/[id]/stages/[stageId]/route.ts');
fixFile('src/app/api/pipelines/[id]/stages/route.ts');

