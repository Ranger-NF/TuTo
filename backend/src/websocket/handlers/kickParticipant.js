const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleKickParticipant(ws, payload) {
    const { sessionId, participantId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) { // Simple shared secret
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        const learner = session.learners.get(participantId);
        if (learner) {
            learner.ws.send(JSON.stringify({ type: 'kicked', payload: { message: 'You have been kicked from the session.' } }));
            learner.ws.close();
            session.learners.delete(participantId);
            // Notify mentor dashboard
            ws.send(JSON.stringify({ type: 'participantKicked', payload: { participantId } }));
        }
    }
}

module.exports = handleKickParticipant;