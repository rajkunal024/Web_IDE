const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { executeCodeStream } = require('../services/executionService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function initSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    socket.on('runCode', async (data) => {
      const { projectId, files, token, language, entryFile, input } = data;
      
      if ((!projectId && !files) || !language) {
        socket.emit('stderr', 'Error: projectId/files, and language parameters are required\n');
        socket.emit('exit', { code: 1, signal: null, executionTime: 0, memoryUsage: '0 KB' });
        return;
      }

      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.userId;
        } catch (err) {
          console.warn("Socket auth check error:", err.message);
        }
      }

      try {
        await executeCodeStream({
          projectId,
          files,
          userId,
          language,
          entryFile,
          input,
          socket
        });
      } catch (err) {
        socket.emit('stderr', `Execution fail: ${err.message}\n`);
        socket.emit('exit', { code: 1, signal: null, executionTime: 0, memoryUsage: '0 KB' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
