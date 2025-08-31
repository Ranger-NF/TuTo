const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleToggleCoding(ws, payload) {
    const { sessionId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        session.isCodingEnabled = !session.isCodingEnabled;
        const message = { type: session.isCodingEnabled ? 'codingEnabled' : 'codingDisabled' };
        session.learners.forEach(learner => {
            if (learner.ws) {
                learner.ws.send(JSON.stringify(message));
            }
        });
        // Also notify the mentor about the state change
        ws.send(JSON.stringify({ type: 'codingToggled', payload: { isCodingEnabled: session.isCodingEnabled } }));
    }
}

module.exports = handleToggleCoding;