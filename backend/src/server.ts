import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.routes';
import { connectDB } from './config/db';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // For local dev, allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Welcome message
app.get('/', (req, res) => {
  res.send('Labour Management Platform Backend API is running.');
});

// Mount routes
app.use('/api', apiRouter);

// Database connection
connectDB();

// Global map of online users: userId -> socketId
const onlineUsers = new Map<string, string>();

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  // Authenticate socket and track online user
  socket.on('register-user', (userId: string) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} registered online with socket ${socket.id}`);
      io.emit('user-status-change', { userId, status: 'online' });
    }
  });

  // Join a specific chat room
  socket.on('join-chat', (chatId: string) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
  });

  // Handle message sending (real-time broadcast fallback)
  socket.on('send-message', (data: { chatId: string; senderId: string; content: string; contentType: string }) => {
    console.log(`Real-time message in ${data.chatId}: ${data.content}`);
    // Broadcast to room
    socket.to(data.chatId).emit('receive-message', data);
  });

  // Handle typing indicator
  socket.on('typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
    socket.to(data.chatId).emit('typing-status', data);
  });

  // User disconnects
  socket.on('disconnect', () => {
    let disconnectedUserId: string | null = null;
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        disconnectedUserId = uid;
        onlineUsers.delete(uid);
        break;
      }
    }
    if (disconnectedUserId) {
      console.log(`User ${disconnectedUserId} disconnected`);
      io.emit('user-status-change', { userId: disconnectedUserId, status: 'offline' });
    }
  });
});

// Make socket.io instance available globally via app settings
app.set('io', io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
export { app, server };
