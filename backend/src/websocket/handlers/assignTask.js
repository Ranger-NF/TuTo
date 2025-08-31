const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');

function handleAssignTask(ws, payload) {
    const { sessionId, taskId, content, learnerIds, secret, language, timeLimit } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        session.tasks.set(taskId, { content, assignedTo: learnerIds, language, timeLimit });
        session.currentTask = { taskId, content, timeLimit, submissions: new Map(), language };
        session.quizState = 'idle'; // Reset quiz state for the new task
        learnerIds.forEach(id => {
            const learner = session.learners.get(id);
            if (learner) {
                learner.task = content;
                learner.language = language;
                learner.ws.send(JSON.stringify({ type: 'taskAssigned', payload: { taskId, content, language, timeLimit } }));
            }
        });
        ws.send(JSON.stringify({ type: 'taskAssignedConfirmation', payload: { taskId, content, learnerIds, language, timeLimit } }));
    }
}

module.exports = handleAssignTask;