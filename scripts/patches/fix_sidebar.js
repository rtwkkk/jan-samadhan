const fs = require('fs');
let code = fs.readFileSync('src/components/layout/sidebar.tsx', 'utf8');

code = code.replace(
  /const \{ profile, profileLoading, account, accountRole, signOut \} = useAuth\(\);/,
  'const { user, profile, profileLoading, account, accountRole, signOut } = useAuth();'
);

code = code.replace(/profile\?\.avatar_url/g, 'user?.avatar_url');
code = code.replace(/profile\.avatar_url/g, 'user.avatar_url');
code = code.replace(/profile\?\.full_name/g, 'user?.full_name');
code = code.replace(/profile\.full_name/g, 'user.full_name');
code = code.replace(/profile\?\.email/g, 'user?.email');
code = code.replace(/profile\.email/g, 'user.email');

fs.writeFileSync('src/components/layout/sidebar.tsx', code);
