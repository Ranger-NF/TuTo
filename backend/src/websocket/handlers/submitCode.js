const { sessions } = require('../../session/sessionManager');
const { handleEvaluateCode } = require('../../services/geminiService');
const { MENTOR_SECRET_KEY } = require('../../config/env');

function handleSubmitCode(ws, payload) {
    const { sessionId, learnerId, code, task } = payload;
    const session = sessions.get(sessionId);
    if (session && session.learners.has(learnerId) && session.quizState === 'running') {
        const learner = session.learners.get(learnerId);
        session.currentTask.submissions.set(learnerId, { code, submittedAt: Date.now() });

        handleEvaluateCode({ sessionId, learnerId, code, task, secret: MENTOR_SECRET_KEY });
        if (learner) {
            learner.ws.send(JSON.stringify({ type: 'submissionAcknowledged' }));
        }
    }
}

module.exports = handleSubmitCode;