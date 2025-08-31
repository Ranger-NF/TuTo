const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleStopSession(ws, payload) {
    const { sessionId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        session.quizState = 'finished';
        session.isCodingEnabled = false; // Disable coding
        if (session.timerInterval) {
            clearInterval(session.timerInterval);
            session.timerInterval = null;
        }
        const finalLeaderboard = { type: 'finalLeaderboard', payload: { leaderboard: session.leaderboard } };
        const codingDisabledMessage = { type: 'codingDisabled' };
        session.learners.forEach(learner => {
            if (learner.ws) {
                learner.ws.send(JSON.stringify(finalLeaderboard));
                learner.ws.send(JSON.stringify(codingDisabledMessage));
            }
        });
        ws.send(JSON.stringify(finalLeaderboard));
        ws.send(JSON.stringify({ type: 'codingToggled', payload: { isCodingEnabled: false } })); // Notify mentor
    }
}

module.exports = handleStopSession;