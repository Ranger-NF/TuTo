const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleImportSession(ws, payload) {
    const { sessionId, fileContent, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) { // Simple shared secret
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    try {
        const sessionData = JSON.parse(fileContent);
        const newSession = {
            mentorWs: ws,
            learners: new Map(sessionData.learners.map(l => [l.id, { ...l, ws: null }])), // WS will be re-established on rejoin
            tasks: new Map(sessionData.tasks),
            leaderboard: sessionData.leaderboard || []
        };
        sessions.set(sessionId, newSession);
        ws.send(JSON.stringify({ type: 'sessionImported', payload: { sessionId } }));
        // Send current session state to mentor
        const learnersData = Array.from(newSession.learners.entries()).map(([id, learner]) => ({
            id,
            name: learner.name,
            code: learner.code,
            task: learner.task,
            gravatar: learner.gravatar
        }));
        ws.send(JSON.stringify({ type: 'sessionState', payload: { learners: learnersData, tasks: Array.from(newSession.tasks.values()), leaderboard: newSession.leaderboard } }));
        console.log(`Session ${sessionId} imported.`);
    } catch (error) {
        console.error('Failed to import session:', error);
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Failed to import session' } }));
    }
}

module.exports = handleImportSession;