const { MENTOR_SECRET_KEY } = require('../../config/env');
const { sessions } = require('../../session/sessionManager');
const { generateUniqueId, getGravatarUrl } = require('../../utils/helpers');

function handleJoinSession(ws, payload) {
    const { sessionId, role, name, secret } = payload;
    const session = sessions.get(sessionId);

    if (!session) {
        ws.send(JSON.stringify({ type: 'sessionNotFound', payload: { error: 'Session not found' } }));
        return;
    }

    if (role === 'mentor') {
        if (secret !== MENTOR_SECRET_KEY) { // Simple shared secret
            ws.send(JSON.stringify({ type: 'authFailed', payload: { error: 'Unauthorized: Invalid secret' } }));
            return;
        }
        session.mentorWs = ws;
        ws.send(JSON.stringify({ type: 'sessionJoined', payload: { sessionId, role } }));
        // Send current session state to mentor
        const learnersData = Array.from(session.learners.entries()).map(([id, learner]) => ({
            id,
            name: learner.name,
            code: learner.code,
            task: learner.task,
            gravatar: learner.gravatar,
            language: learner.language
        }));
        ws.send(JSON.stringify({ type: 'sessionState', payload: { learners: learnersData, tasks: Array.from(session.tasks.values()), leaderboard: session.leaderboard, isCodingEnabled: session.isCodingEnabled, currentTask: session.currentTask, quizState: session.quizState } }));
        console.log(`Mentor joined session: ${sessionId}`);
    } else if (role === 'learner') {
        let learnerId;
        let existingLearner = null;

        // Check if a learner with the same name already exists
        for (const [id, learner] of session.learners.entries()) {
            if (learner.name === name) {
                existingLearner = learner;
                learnerId = id;
                break;
            }
        }

        if (existingLearner) {
            // Update WebSocket connection for returning learner
            existingLearner.ws = ws;
            console.log(`Learner ${name} reconnected to session: ${sessionId}`);
        } else {
            // New learner
            learnerId = generateUniqueId();
            const gravatar = getGravatarUrl(name + '@example.com'); // Using name as a substitute for email
            session.learners.set(learnerId, { ws, name, code: '', task: '', gravatar });
            console.log(`Learner ${name} joined session: ${sessionId}`);
        }

        const joinedLearner = session.learners.get(learnerId);
        ws.send(JSON.stringify({ type: 'sessionJoined', payload: { sessionId, role, learnerId, gravatar: joinedLearner.gravatar, isCodingEnabled: session.isCodingEnabled } }));

        // If a task is active, send it to the learner
        if (session.currentTask) {
            joinedLearner.task = session.currentTask.content;
            joinedLearner.language = session.currentTask.language;
            ws.send(JSON.stringify({ type: 'taskAssigned', payload: { ...session.currentTask, language: session.currentTask.language } }));
        }

        // If a quiz is running, inform the learner
        if (session.quizState === 'running') {
            ws.send(JSON.stringify({ type: 'quizRoundStarted', payload: { timeLimit: session.currentTask.timeLimit } }));
        }

        // Notify mentor
        if (session.mentorWs) {
            const eventType = existingLearner ? 'learnerReconnected' : 'learnerJoined';
            session.mentorWs.send(JSON.stringify({ type: eventType, payload: { id: learnerId, name, code: joinedLearner.code, task: joinedLearner.task, gravatar: joinedLearner.gravatar, language: joinedLearner.language } }));
        }
    }
}

module.exports = handleJoinSession;