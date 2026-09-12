const fs = require('fs');

function addKey(file, path, key, value) {
  let content = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(content);
  
  let current = json;
  for (const p of path) {
    if (!current[p]) current[p] = {};
    current = current[p];
  }
  
  current[key] = value;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`Updated ${key} in ${file}`);
}

addKey('messages/en.json', ['Contacts', 'form'], 'enterCustomField', 'Enter {name}');
addKey('messages/ko.json', ['Contacts', 'form'], 'enterCustomField', '{name} 입력');
