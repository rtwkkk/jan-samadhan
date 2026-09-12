const fs = require('fs');
const file = 'src/components/settings/settings-overview.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldQueries = `          supabase
            .from('message_templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('message_templates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'PENDING'),`;
            
const newQueries = `          fetch('/api/whatsapp/templates', { cache: 'no-store' }).then((r) => r.json()),
          Promise.resolve(null),`;
          
code = code.replace(oldQueries, newQueries);

const oldAssignment = `      setCounts({
        members,
        pendingInvites,
        templates:
          templatesTotal.status === 'fulfilled'
            ? templatesTotal.value.count ?? null
            : null,
        templatesPending:
          templatesPending.status === 'fulfilled'
            ? templatesPending.value.count ?? null
            : null,
        tags: tagsRes.status === 'fulfilled' ? tagsRes.value.count ?? null : null,
        customFields:
          fieldsRes.status === 'fulfilled' ? fieldsRes.value.count ?? null : null,
      });`;
      
const newAssignment = `      setCounts({
        members,
        pendingInvites,
        templates: templatesTotal.status === 'fulfilled' && Array.isArray(templatesTotal.value) ? templatesTotal.value.length : null,
        templatesPending: templatesTotal.status === 'fulfilled' && Array.isArray(templatesTotal.value) ? templatesTotal.value.filter((t: any) => t.status === 'PENDING').length : null,
        tags: tagsRes.status === 'fulfilled' ? tagsRes.value.count ?? null : null,
        customFields:
          fieldsRes.status === 'fulfilled' ? fieldsRes.value.count ?? null : null,
      });`;
      
code = code.replace(oldAssignment, newAssignment);

fs.writeFileSync(file, code);
