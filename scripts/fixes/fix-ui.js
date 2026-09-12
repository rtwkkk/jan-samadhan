const fs = require('fs');
const pickerFile = 'src/components/inbox/template-picker.tsx';
let picker = fs.readFileSync(pickerFile, 'utf8');

picker = picker.replace(/const { data, error } = await supabase[\s\S]*?if \(error\) {[\s\S]*?} else {[\s\S]*?}/, `
      const res = await fetch('/api/whatsapp/templates');
      if (cancelled) return;
      if (!res.ok) {
        console.error("Failed to fetch templates:", await res.text());
        setTemplates([]);
      } else {
        let data = await res.json();
        data = data.filter((t: any) => t.status === "APPROVED");
        setTemplates((data as MessageTemplate[]) ?? []);
      }
`);
fs.writeFileSync(pickerFile, picker);
