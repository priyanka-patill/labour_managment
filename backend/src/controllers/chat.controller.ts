import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getChats(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Find chats where the current user is a participant
    const chats = await db.chats.find({ participants: req.user.id });
    
    // Hydrate participants profile info (name, avatar, role)
    const hydratedChats = [];
    for (const chat of chats) {
      const otherParticipantId = chat.participants.find((p: string) => p !== req.user?.id);
      const otherUser = await db.users.findById(otherParticipantId);
      
      if (otherUser) {
        hydratedChats.push({
          ...chat,
          recipient: {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar,
            role: otherUser.role,
            availability: otherUser.availability
          }
        });
      }
    }
    
    return res.status(200).json(hydratedChats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function startChat(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { recipientId } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID required' });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // Check if chat already exists
    let chat = await db.chats.findOne({
      participants: { $all: [req.user.id, recipientId] }
    });

    // Fallback collection fallback for $all array match
    if (!chat) {
      const allChats = await db.chats.find();
      chat = allChats.find((c: any) => 
        c.participants.includes(req.user?.id) && c.participants.includes(recipientId)
      ) || null;
    }

    if (!chat) {
      // Create new chat room
      chat = await db.chats.create({
        participants: [req.user.id, recipientId],
        lastMessage: 'Conversation started',
        lastMessageAt: new Date().toISOString()
      });
    }

    const otherUser = await db.users.findById(recipientId);
    return res.status(201).json({
      ...chat,
      recipient: {
        _id: otherUser?._id,
        name: otherUser?.name,
        avatar: otherUser?.avatar,
        role: otherUser?.role,
        availability: otherUser?.availability
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { chatId } = req.params;
    const messages = await db.messages.find({ chatId });
    
    // Mark messages sent by the other participant as seen
    await db.messages.find({ chatId, seen: false }).then(async (unseen: any[]) => {
      for (const msg of unseen) {
        if (msg.senderId !== req.user?.id) {
          await db.messages.findByIdAndUpdate(msg._id, { seen: true });
        }
      }
    });

    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const { chatId, content, contentType } = req.body;
    if (!chatId || !content) {
      return res.status(400).json({ error: 'Chat ID and content required' });
    }

    const message = await db.messages.create({
      chatId,
      senderId: req.user.id,
      content,
      contentType: contentType || 'text',
      seen: false
    });

    // Update parent chat thread last message metadata
    await db.chats.findByIdAndUpdate(chatId, {
      lastMessage: content,
      lastMessageAt: new Date().toISOString()
    });

    return res.status(201).json(message);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
