const fs = require('fs');
const path = require('path');
const { MENTOR_SECRET_KEY, SESSIONS_DIR } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleExportSession(ws, payload) {
    const { sessionId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) { // Simple shared secret
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        const sessionData = {
            learners: Array.from(session.learners.entries()).map(([id, learner]) => ({
                id,
                name: learner.name,
                code: learner.code,
                task: learner.task,
                gravatar: learner.gravatar
            })),
            tasks: Array.from(session.tasks.entries()),
            leaderboard: session.leaderboard
        };
        const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
        fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), err => {
            if (err) {
                console.error('Failed to export session:', err);
                ws.send(JSON.stringify({ type: 'error', payload: { message: 'Failed to export session' } }));
            } else {
                console.log(`Session ${sessionId} exported to ${filePath}`);
                ws.send(JSON.stringify({ type: 'sessionExported', payload: { sessionId, filePath: `${sessionId}.json` } }));
            }
        });
    }
}

module.exports = handleExportSession;