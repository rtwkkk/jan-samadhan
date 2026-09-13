const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Revert files first
execSync('git checkout src/main.jsx src/user.jsx src/official.jsx', { stdio: 'inherit' });

const filesToUpdate = [
  'main.jsx',
  'user.jsx',
  'official.jsx'
];

const apiVar = "${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}";

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, 'src', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace backtick strings: `http://localhost:5000/api/...`
    content = content.replace(/`http:\/\/localhost:5000\/api\/([^`]*)`/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}/$1`');
    
    // Replace single quote strings
    content = content.replace(/'http:\/\/localhost:5000\/api\/([^']*)'/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}/$1`');

    // Replace double quote strings
    content = content.replace(/"http:\/\/localhost:5000\/api\/([^"]*)"/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}/$1`');

    // There's also one for 'http://localhost:5000/uploads/' in official.jsx
    content = content.replace(/`http:\/\/localhost:5000\/uploads\/([^`]*)`/g, '`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(\'/api\', \'\') : \'http://localhost:5000\'}/uploads/$1`');

    // Edge cases where it is concatenated, e.g., 'http://localhost:5000/api/admin/match/' + selectedChallenge.id
    content = content.replace(/'http:\/\/localhost:5000\/api\//g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}/');
    content = content.replace(/"http:\/\/localhost:5000\/api\//g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}/');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
