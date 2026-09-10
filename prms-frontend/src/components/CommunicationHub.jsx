import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { communicationApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  Send,
  MessageCircle,
  ChevronLeft,
} from 'lucide-react';
import './CommunicationHub.css';

function CommunicationHub() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages();
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await communicationApi.list();
      const msgs = res.data?.data ?? [];
      // Group by conversationId
      const convMap = {};
      msgs.forEach((m) => {
        const cid = m.conversationId;
        const isMine = m.senderId === user?.id;
        const isUnreadForMe = !m.isRead && m.receiverId === user?.id;
        if (!convMap[cid]) {
          const other = isMine ? m.receiver : m.sender;
          convMap[cid] = {
            id: cid,
            partner: other || { full_name: 'User' },
            lastMessage: m.content,
            lastAt: m.created_at,
            unread: isUnreadForMe ? 1 : 0,
          };
        } else {
          if (isUnreadForMe) {
            convMap[cid].unread += 1;
          }
        }
      });
      setConversations(Object.values(convMap).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    try {
      const res = await communicationApi.getMessages(selectedConv.id);
      setMessages(res.data?.data ?? []);
      // Mark all as read
      const unread = (res.data?.data ?? []).filter((m) => !m.isRead);
      await Promise.all(
        unread.map((m) => communicationApi.markMessageRead(m.id))
      );
      // Update unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConv.id ? { ...c, unread: 0 } : c))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSend() {
    if (!newMessage.trim()) return;
    try {
      await communicationApi.send({
        content: newMessage,
        conversationId: selectedConv.id,
        receiverId: selectedConv.partner.id,
      });
      setNewMessage('');
      loadMessages();
    } catch (e) {
      console.error(e);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return <div className="comm-loading">Loading messages...</div>;

  return (
    <div className="communication-hub">
      {/* Conversation list */}
      {!selectedConv ? (
        <div className="comm-list-full">
          <h2 className="comm-title">Messages</h2>
          {conversations.length === 0 ? (
            <div className="comm-empty">
              <MessageCircle size={32} className="comm-empty-icon" />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.div
                key={conv.id}
                className="comm-list-item"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="comm-avatar">{conv.partner?.full_name?.[0]?.toUpperCase() || '?'}</div>
                <div className="comm-list-content">
                  <div className="comm-list-header">
                    <span className="comm-list-name">{conv.partner?.full_name || 'User'}</span>
                    <span className="comm-list-time">{new Date(conv.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="comm-list-preview">{conv.lastMessage}</div>
                </div>
                {conv.unread > 0 && (
                  <span className="comm-unread-badge">{conv.unread}</span>
                )}
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* Conversation thread */
        <div className="comm-thread">
          <div className="comm-thread-header">
            <button className="comm-back-btn" onClick={() => setSelectedConv(null)}>
              <ChevronLeft size={18} />
            </button>
            <div className="comm-thread-avatar">{selectedConv.partner?.full_name?.[0]?.toUpperCase() || '?'}</div>
            <span className="comm-thread-name">{selectedConv.partner?.full_name || 'User'}</span>
          </div>

          <div className="comm-messages">
            <AnimatePresence>
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    className={`comm-msg-bubble ${isMe ? 'comm-msg-mine' : 'comm-msg-theirs'}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="comm-msg-text">{msg.content}</div>
                    <div className="comm-msg-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="comm-input-row">
            <input
              type="text"
              className="comm-input"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="comm-send-btn" onClick={handleSend}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunicationHub;
