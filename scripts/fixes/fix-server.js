const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace io.use
const start = code.indexOf('io.use(async (socket: any, next: any) => {');
const end = code.indexOf('io.on(\'connection\', (socket: any) => {');

const replacement = `
  io.use(async (socket: any, next: any) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error('Authentication error: No cookie'));
      
      const { parse } = await import('cookie');
      const cookies = parse(cookieHeader);
      const token = cookies['wacrm_session'];
      if (!token) return next(new Error('Authentication error: No token'));

      const { createHash } = await import('crypto');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const { connectToDatabase } = await import('./src/lib/mongodb/client');
      await connectToDatabase();
      const mongoose = (await import('mongoose')).default;
      const Session = mongoose.models.Session || mongoose.model('Session', new mongoose.Schema({ userId: String, expiresAt: Date, revokedAt: Date }, { strict: false }));
      const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ accountId: String, accountRole: String }, { strict: false }));
      
      const session = await Session.findById(tokenHash).lean() as any;
      if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
        return next(new Error('Authentication error: Invalid session'));
      }
      
      const user = await User.findById(session.userId).lean() as any;
      if (!user || !user.accountId) {
        return next(new Error('Authentication error: No account'));
      }

      socket.data.userId = user._id;
      socket.data.accountId = user.accountId;
      socket.data.role = user.accountRole;

      next();
    } catch (err) {
      console.error('Socket.IO auth error:', err);
      next(new Error('Authentication error'));
    }
  });

  `;

code = code.substring(0, start) + replacement + code.substring(end);

fs.writeFileSync('server.ts', code);
