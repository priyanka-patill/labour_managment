import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export function useSocket(userId: string | undefined, onMessageReceived?: (msg: any) => void, onTypingReceived?: (data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect to backend socket server
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      // Register online status
      socket.emit('register-user', userId);
    });

    if (onMessageReceived) {
      socket.on('receive-message', onMessageReceived);
    }

    if (onTypingReceived) {
      socket.on('typing-status', onTypingReceived);
    }

    return () => {
      socket.disconnect();
      console.log('Disconnected from socket server');
    };
  }, [userId, onMessageReceived, onTypingReceived]);

  const joinChat = (chatId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-chat', chatId);
    }
  };

  const sendMessage = (chatId: string, senderId: string, content: string, contentType = 'text') => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { chatId, senderId, content, contentType });
    }
  };

  const setTyping = (chatId: string, isTyping: boolean) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('typing', { chatId, userId, isTyping });
    }
  };

  return {
    socket: socketRef.current,
    joinChat,
    sendMessage,
    setTyping
  };
}
export default useSocket;
