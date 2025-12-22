const ProfanityFilter = require('../utils/profanityFilter');
const LiveChatService = require('../services/LiveChatService');

const filter = new ProfanityFilter();

// In-memory rate limiter: { userId: lastMessageTimestamp }
const rateLimits = {};
const RATE_LIMIT_MS = 2000; // 2 seconds

module.exports = (io, socket) => {
    const user = socket.user; // Attached via middleware

    // 1. JOIN CHAT
    socket.on('join-chat', async ({ liveClassId }) => {
        try {
            if (!user) return;

            socket.join(`live-class:${liveClassId}`);

            // Send recent messages to user
            const history = await LiveChatService.getMessages(liveClassId, 50);
            socket.emit('chat-history', history);

            // Get settings
            const settings = await LiveChatService.getClassSettings(liveClassId);
            socket.emit('chat-settings', settings);

        } catch (err) {
            console.error('Join Chat Error:', err);
            socket.emit('chat-error', { message: 'Failed to join chat' });
        }
    });

    // 2. SEND MESSAGE
    socket.on('send-message', async (payload) => {
        try {
            const { liveClassId, message, messageType } = payload;

            if (!user) return;

            // Rate Limiting
            const now = Date.now();
            const lastMsg = rateLimits[user.id] || 0;
            if (now - lastMsg < RATE_LIMIT_MS && user.role === 'student') {
                socket.emit('chat-error', { message: 'You are sending messages too fast.' });
                return;
            }
            rateLimits[user.id] = now;

            // Validate Settings
            const settings = await LiveChatService.getClassSettings(liveClassId);

            if (user.role === 'student') {
                if (settings && settings.chat_enabled === false) {
                    socket.emit('chat-error', { message: 'Chat is currently disabled.' });
                    return;
                }
                if (settings && settings.questions_only_mode === true && messageType !== 'question') {
                    socket.emit('chat-error', { message: 'Only questions are allowed right now.' });
                    return;
                }
            }

            // Profanity Filter
            let cleanMessage = message;
            if (filter.isProfane(message)) {
                cleanMessage = filter.clean(message);
            }

            // Save Message
            const savedMsg = await LiveChatService.saveMessage({
                liveClassId,
                senderId: user.id,
                senderName: user.name,
                senderRole: user.role,
                message: cleanMessage,
                messageType: messageType || 'chat'
            });

            // Broadcast to Room
            io.to(`live-class:${liveClassId}`).emit('new-message', savedMsg);

        } catch (err) {
            console.error('Send Message Error:', err);
        }
    });

    // 3. MODERATION ACTIONS
    socket.on('mod-action', async (payload) => {
        if (user.role !== 'teacher' && user.role !== 'admin') return;

        try {
            const { action, liveClassId, targetId, value } = payload;

            if (action === 'delete-message') {
                await LiveChatService.deleteMessage(targetId);
                io.to(`live-class:${liveClassId}`).emit('message-deleted', { messageId: targetId });
            }

            if (action === 'pin-message') {
                await LiveChatService.togglePin(targetId, value);
                io.to(`live-class:${liveClassId}`).emit('message-pinned', { messageId: targetId, isPinned: value });
            }

            if (action === 'toggle-chat') {
                const settings = await LiveChatService.updateChatSettings(liveClassId, { chatEnabled: value });
                io.to(`live-class:${liveClassId}`).emit('chat-settings-updated', settings);
            }

            if (action === 'toggle-questions') {
                const settings = await LiveChatService.updateChatSettings(liveClassId, { questionsOnly: value });
                io.to(`live-class:${liveClassId}`).emit('chat-settings-updated', settings);
            }

        } catch (err) {
            console.error('Mod Action Error:', err);
        }
    });
};
