const fs = require('fs');
let code = fs.readFileSync('src/components/layout/header.tsx', 'utf8');

code = code.replace(
  /const \{ profile, signOut \} = useAuth\(\);/,
  'const { user, signOut } = useAuth();'
);

code = code.replace(/profile\?\.avatar_url/g, 'user?.avatar_url');
code = code.replace(/profile\.avatar_url/g, 'user.avatar_url');
code = code.replace(/profile\?\.full_name/g, 'user?.full_name');
code = code.replace(/profile\.full_name/g, 'user.full_name');
code = code.replace(/profile\?\.email/g, 'user?.email');
code = code.replace(/profile\.email/g, 'user.email');

fs.writeFileSync('src/components/layout/header.tsx', code);
