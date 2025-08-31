const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleStopQuizRound(ws, payload) {
    const { sessionId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws && session.quizState === 'running') {
        if (session.timerInterval) {
            clearInterval(session.timerInterval);
            session.timerInterval = null;
        }
        session.quizState = 'finished';
        session.isCodingEnabled = false; // Disable coding

        const broadcast = (msg) => {
            if (session.mentorWs) session.mentorWs.send(JSON.stringify(msg));
            session.learners.forEach(l => l.ws && l.ws.send(JSON.stringify(msg)));
        };

        broadcast({ type: 'quizRoundFinished' });
        broadcast({ type: 'codingDisabled' });
        if (session.mentorWs) {
            session.mentorWs.send(JSON.stringify({ type: 'codingToggled', payload: { isCodingEnabled: false } }));
        }
    }
}

module.exports = handleStopQuizRound;