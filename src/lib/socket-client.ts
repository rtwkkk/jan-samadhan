import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Determine the base URL. In the browser, it defaults to window.location
    // which is correct since the server.ts hosts both Next.js and Socket.IO.
    socket = io({
      // We must pass credentials to include the wacrm_session cookie!
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling']
    });
  }
  return socket;
}
