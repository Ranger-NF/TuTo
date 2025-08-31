const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');
const { handleEvaluateCode } = require('../../services/geminiService');

function handleStartQuizRound(ws, payload) {
    const { sessionId, secret } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws && session.currentTask) {
        session.quizState = 'running';
        session.isCodingEnabled = true; // Enable coding
        const { timeLimit } = session.currentTask;
        session.currentTask.startTime = Date.now();

        const broadcastToLearners = (msg) => {
            session.learners.forEach(l => l.ws && l.ws.send(JSON.stringify(msg)));
        };

        broadcastToLearners({ type: 'quizRoundStarted', payload: { timeLimit } });

        if (session.mentorWs) {
            session.mentorWs.send(JSON.stringify({ type: 'quizRoundStartedConfirmation' }));
            session.mentorWs.send(JSON.stringify({ type: 'codingToggled', payload: { isCodingEnabled: true } }));
        }

        // Clear any existing timer
        if (session.timerInterval) clearInterval(session.timerInterval);

        // Set a timer for the quiz round
        session.timerInterval = setInterval(() => {
            const elapsed = (Date.now() - session.currentTask.startTime) / 1000;
            const timeRemaining = Math.max(0, timeLimit - elapsed);

            const broadcast = (msg) => {
                if (session.mentorWs) session.mentorWs.send(JSON.stringify(msg));
                session.learners.forEach(l => l.ws && l.ws.send(JSON.stringify(msg)));
            };
            broadcast({ type: 'timerUpdate', payload: { timeRemaining } });

            if (timeRemaining <= 0) {
                clearInterval(session.timerInterval);
                session.timerInterval = null;

                if (session.quizState === 'running') {
                    // Auto-submit for learners who haven't submitted
                    session.learners.forEach((learner, learnerId) => {
                        if (!session.currentTask.submissions.has(learnerId)) {
                            handleEvaluateCode({ sessionId, learnerId, code: learner.code, task: session.currentTask.content, secret: MENTOR_SECRET_KEY });
                        }
                    });
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
        }, 1000);
    }
}

module.exports = handleStartQuizRound;