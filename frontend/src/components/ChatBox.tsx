"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSocket } from '../hooks/useSocket';
import { 
  Send, Image, Paperclip, Phone, Video, Smile, Search, 
  User, Mic, PhoneOff, ArrowLeft, Volume2, Shield, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatBox() {
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Call simulation state
  const [callState, setCallState] = useState<{ active: boolean; type: 'voice' | 'video' | null; status: 'dialing' | 'connected' | 'ended' }>({
    active: false,
    type: null,
    status: 'dialing'
  });
  const [callDuration, setCallDuration] = useState(0);

  const [otherIsTyping, setOtherIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hook up real-time websocket
  const { joinChat, sendMessage, setTyping } = useSocket(
    user?._id,
    // On receive message:
    (msg: any) => {
      if (selectedChat && msg.chatId === selectedChat._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      // Refetch chat list to update lastMessage previews
      fetchChatList();
    },
    // On typing status update:
    (data: any) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setOtherIsTyping(data.isTyping);
      }
    }
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchChatList = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5005/api/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChats(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat list:', err);
    }
  };

  const fetchMessages = async (chatId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5005/api/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatList();
  }, [token]);

  useEffect(() => {
    if (selectedChat) {
      joinChat(selectedChat._id);
      fetchMessages(selectedChat._id);
      setOtherIsTyping(false);
    }
  }, [selectedChat]);

  // Handle typing event
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (selectedChat) {
      setTyping(selectedChat._id, true);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(selectedChat._id, false);
      }, 1500);
    }
  };

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat || !token || !user) return;

    const content = inputText.trim();
    setInputText('');
    setTyping(selectedChat._id, false);

    // Optimistic local state update
    const tempMsg = {
      _id: Math.random().toString(),
      chatId: selectedChat._id,
      senderId: user._id,
      content,
      contentType: 'text',
      seen: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    try {
      // Send to backend
      const res = await fetch('http://localhost:5005/api/chats/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: selectedChat._id,
          content,
          contentType: 'text'
        })
      });
      
      const realMsg = await res.json();
      
      // Emit socket broadcast
      sendMessage(selectedChat._id, user._id, content, 'text');
      
      // Update preview in list
      fetchChatList();
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  // Dialing call simulated timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState.active && callState.status === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const handleStartCall = (type: 'voice' | 'video') => {
    setCallDuration(0);
    setCallState({ active: true, type, status: 'dialing' });
    
    // Simulate connection pick up after 3 seconds
    setTimeout(() => {
      setCallState(prev => prev.active ? { ...prev, status: 'connected' } : prev);
    }, 2800);
  };

  const handleEndCall = () => {
    setCallState(prev => ({ ...prev, status: 'ended' }));
    setTimeout(() => {
      setCallState({ active: false, type: null, status: 'dialing' });
      setCallDuration(0);
    }, 800);
  };

  const formatDuration = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredChats = chats.filter((c: any) => 
    c.recipient?.name?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100vh-120px)] bg-zinc-950 rounded-2xl border border-zinc-700 overflow-hidden flex relative shadow-2xl">
      
      {/* Threads List Pane */}
      <div className={`w-full md:w-80 border-r border-zinc-700 flex flex-col shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-700 space-y-3">
          <h3 className="font-bold text-sm text-zinc-100">Direct Messages</h3>
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 rounded-xl border border-zinc-700">
            <Search size={14} className="text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search chat..." 
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-500 w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 p-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">No active chats</div>
          ) : (
            filteredChats.map((c: any) => (
              <button
                key={c._id}
                onClick={() => setSelectedChat(c)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer ${selectedChat?._id === c._id ? 'bg-indigo-600/10 border border-indigo-500/20' : 'hover:bg-zinc-900/40 border border-transparent'}`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={c.recipient?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.recipient?.name}`} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full bg-zinc-800 object-cover border border-zinc-700"
                  />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#121214] ${c.recipient?.availability === 'available' ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-zinc-200 truncate">{c.recipient?.name}</h4>
                    <span className="text-[9px] text-zinc-500 font-medium">{new Date(c.lastMessageAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate mt-1">{c.lastMessage}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Messaging panel */}
      <div className={`flex-1 flex flex-col bg-zinc-900 ${!selectedChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Active recipient header */}
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-1 text-zinc-400 hover:text-zinc-50 mr-1"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="relative shrink-0">
                  <img 
                    src={selectedChat.recipient?.avatar} 
                    alt="avatar" 
                    className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700"
                  />
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#121214] ${selectedChat.recipient?.availability === 'available' ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-xs text-zinc-200 truncate leading-none">{selectedChat.recipient?.name}</h4>
                    {selectedChat.recipient?.isVerified && (
                      <span className="w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[7px] text-white">✓</span>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-500 capitalize mt-1 leading-none">{selectedChat.recipient?.role}</p>
                </div>
              </div>

              {/* Call Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleStartCall('voice')}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 transition cursor-pointer"
                >
                  <Phone size={14} />
                </button>
                <button 
                  onClick={() => handleStartCall('video')}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 transition cursor-pointer"
                >
                  <Video size={14} />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-t-indigo-500 border-zinc-850 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {messages.map((msg: any) => {
                    const isSelf = msg.senderId === user?._id;
                    return (
                      <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[70%] space-y-1">
                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${isSelf ? 'bg-indigo-600 text-white rounded-br-none shadow-md' : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-zinc-800/80'}`}>
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-1.5 text-[9px] text-zinc-500 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isSelf && (
                              <span className={msg.seen ? 'text-indigo-400' : 'text-zinc-600'} title={msg.seen ? 'Seen' : 'Delivered'}>
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Real-time typing bubble */}
                  {otherIsTyping && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900 text-zinc-500 text-xs py-2 px-4 rounded-full rounded-bl-none border border-zinc-800/80 flex items-center gap-1">
                        <span>typing</span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-200"></span>
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-300"></span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef}></div>
                </>
              )}
            </div>

            {/* Input field */}
            <form onSubmit={handleSendSubmit} className="p-4 border-t border-zinc-700 bg-zinc-950/60 backdrop-blur-md flex items-center gap-3">
              <button 
                type="button" 
                className="p-2 text-zinc-500 hover:text-zinc-300 transition shrink-0 cursor-pointer"
                title="Attach Files"
              >
                <Paperclip size={16} />
              </button>
              <button 
                type="button" 
                className="p-2 text-zinc-500 hover:text-zinc-300 transition shrink-0 cursor-pointer"
                title="Attach Images"
              >
                <Image size={16} />
              </button>
              
              <div className="flex-1 bg-zinc-950/60 rounded-xl border border-zinc-800 px-3 py-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type message..."
                  value={inputText}
                  onChange={handleInputChange}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-zinc-200 placeholder-zinc-500 w-full"
                />
                <button type="button" className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
                  <Smile size={15} />
                </button>
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition shadow-md shadow-indigo-600/15 shrink-0 cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center p-6 text-zinc-500">
            <MessageSquare size={36} className="text-zinc-700 animate-pulse" />
            <h4 className="font-semibold text-sm text-zinc-400">Your Conversations</h4>
            <p className="text-[11px] max-w-xs leading-normal">Select an existing thread on the left to start messaging, or click "Message" on worker cards.</p>
          </div>
        )}
      </div>

      {/* CALL DIALOG OVERLAY (VOICE/VIDEO CALLING SIMULATOR) */}
      <AnimatePresence>
        {callState.active && (
          <div className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col justify-between p-8 text-center text-zinc-50 backdrop-blur-md">
            
            {/* Top brand stamp */}
            <div className="flex justify-center items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
              <Shield size={10} className="text-indigo-400" /> Secure Call encrypted
            </div>

            {/* Avatar & dialing state */}
            <div className="space-y-4">
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping"></div>
                <img 
                  src={selectedChat?.recipient?.avatar} 
                  alt="avatar" 
                  className="w-full h-full rounded-full bg-zinc-800 border-2 border-indigo-500 relative z-10 object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-xl">{selectedChat?.recipient?.name}</h3>
                <p className="text-xs text-zinc-500 capitalize">{selectedChat?.recipient?.role}</p>
              </div>
              <div className="pt-4">
                {callState.status === 'dialing' ? (
                  <span className="text-xs text-indigo-400 font-semibold tracking-wider flex items-center justify-center gap-1">
                    <Volume2 size={12} className="animate-bounce" /> DIALING...
                  </span>
                ) : callState.status === 'connected' ? (
                  <div className="space-y-1">
                    <span className="text-xs text-emerald-400 font-bold tracking-widest uppercase">CONNECTED</span>
                    <p className="text-sm font-mono text-zinc-400">{formatDuration(callDuration)}</p>
                  </div>
                ) : (
                  <span className="text-xs text-red-500 font-bold uppercase">CALL ENDED</span>
                )}
              </div>
            </div>

            {/* Call Action buttons */}
            <div className="flex justify-center items-center gap-8 pb-10">
              <button 
                type="button" 
                className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full flex items-center justify-center transition cursor-pointer"
              >
                <Mic size={18} />
              </button>
              
              <button
                type="button"
                onClick={handleEndCall}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default ChatBox;
