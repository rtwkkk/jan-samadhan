const fs = require('fs');

let sidebar = fs.readFileSync('src/components/layout/sidebar.tsx', 'utf8');
sidebar = sidebar.replace(/\{ href: "\/broadcasts".*?\n/g, '');
sidebar = sidebar.replace(/\{ href: "\/automations".*?\n/g, '');
sidebar = sidebar.replace(/\{ href: "\/flows".*?\n/g, '');
sidebar = sidebar.replace(/\{ href: "\/agents".*?\n/g, '');
fs.writeFileSync('src/components/layout/sidebar.tsx', sidebar);

let header = fs.readFileSync('src/components/layout/header.tsx', 'utf8');
header = header.replace(/".*broadcasts": "broadcasts",\n/g, '');
header = header.replace(/".*automations": "automations",\n/g, '');
header = header.replace(/".*flows": "flows",\n/g, '');
header = header.replace(/".*agents": "aiAgents",\n/g, '');
fs.writeFileSync('src/components/layout/header.tsx', header);

let quickActions = fs.readFileSync('src/components/dashboard/quick-actions.tsx', 'utf8');
quickActions = quickActions.replace(/\{ labelKey: 'newBroadcast'.*?\n/g, '');
quickActions = quickActions.replace(/\{ labelKey: 'newAutomation'.*?\n/g, '');
fs.writeFileSync('src/components/dashboard/quick-actions.tsx', quickActions);

