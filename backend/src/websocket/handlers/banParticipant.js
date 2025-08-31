const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleBanParticipant(ws, payload) {
    // For simplicity, banning will just kick and prevent rejoining for the current session instance.
    // In a real app, this would involve persistent storage of banned IDs.
    const { sessionId, participantId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) { // Simple shared secret
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        const learner = session.learners.get(participantId);
        if (learner) {
            learner.ws.send(JSON.stringify({ type: 'banned', payload: { message: 'You have been banned from the session.' } }));
            learner.ws.close();
            session.learners.delete(participantId);
            // Notify mentor dashboard
            ws.send(JSON.stringify({ type: 'participantBanned', payload: { participantId } }));
        }
    }
}

module.exports = handleBanParticipant;