const { sessions } = require('../../session/sessionManager');

function handleCodeChange(ws, payload) {
    const { sessionId, learnerId, code } = payload;
    const session = sessions.get(sessionId);
    if (session && session.learners.has(learnerId)) {
        session.learners.get(learnerId).code = code;
        // Broadcast code change to mentor
        if (session.mentorWs) {
            session.mentorWs.send(JSON.stringify({ type: 'learnerCodeChange', payload: { learnerId, code } }));
        }
    }
}

module.exports = handleCodeChange;