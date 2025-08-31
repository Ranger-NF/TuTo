const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');
const { generateUniqueId } = require('../../utils/helpers');

function handleCreateSession(ws, payload) {
    const { secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) { // Simple shared secret
        ws.send(JSON.stringify({ type: 'authFailed', payload: { error: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const sessionId = generateUniqueId();
    sessions.set(sessionId, {
        mentorWs: ws,
        learners: new Map(),
        tasks: new Map(), // Map<taskId, { content: string, assignedTo: string[] }>
        leaderboard: [], // { learnerId, correctness, speed }
        isCodingEnabled: false, // Default to disabled
        quizState: 'idle', // 'idle', 'running', 'finished'
        currentTask: null, // { taskId, content, timeLimit, startTime, timer }
        timerInterval: null
    });
    ws.send(JSON.stringify({ type: 'sessionCreated', payload: { sessionId } }));
    console.log(`Session created: ${sessionId}`);
}

module.exports = handleCreateSession;