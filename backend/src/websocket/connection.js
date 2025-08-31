const handleMessage = require('./messageHandler');
const { sessions } = require('../session/sessionManager');

function onConnection(ws) {
    console.log('Client connected');

    ws.on('message', message => handleMessage(ws, message));

    ws.on('close', () => {
        console.log('Client disconnected');
        // Remove disconnected client from sessions
        sessions.forEach((session, sessionId) => {
            if (session.mentorWs === ws) {
                session.mentorWs = null; // Mentor disconnected
                console.log(`Mentor disconnected from session ${sessionId}`);
            } else {
                session.learners.forEach((learner, learnerId) => {
                    if (learner.ws === ws) {
                        session.learners.delete(learnerId);
                        if (session.mentorWs) {
                            session.mentorWs.send(JSON.stringify({ type: 'learnerDisconnected', payload: { learnerId } }));
                        }
                        console.log(`Learner ${learner.name} disconnected from session ${sessionId}`);
                    }
                });
            }
            // If no mentor and no learners, clean up session
            if (!session.mentorWs && session.learners.size === 0) {
                sessions.delete(sessionId);
                console.log(`Session ${sessionId} cleaned up due to no participants.`);
            }
        });
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
}

module.exports = onConnection;