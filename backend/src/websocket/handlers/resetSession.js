const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleResetSession(ws, payload) {
    const { sessionId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        // Clear timer
        if (session.timerInterval) {
            clearInterval(session.timerInterval);
            session.timerInterval = null;
        }

        // Reset session state
        session.quizState = 'idle';
        session.currentTask = null;
        session.isCodingEnabled = false;

        // Reset learners' state and notify them
        session.learners.forEach(learner => {
            learner.code = '';
            learner.task = '';
            if (learner.ws) {
                learner.ws.send(JSON.stringify({ type: 'sessionReset' }));
            }
        });

        // Notify mentor of the reset state
        const learnersData = Array.from(session.learners.entries()).map(([id, learner]) => ({
            id,
            name: learner.name,
            code: learner.code,
            task: learner.task,
            gravatar: learner.gravatar
        }));
        ws.send(JSON.stringify({ type: 'sessionState', payload: { learners: learnersData, tasks: [], leaderboard: session.leaderboard, isCodingEnabled: false, currentTask: null, quizState: 'idle' } }));
        console.log(`Session ${sessionId} has been reset.`);
    }
}

module.exports = handleResetSession;