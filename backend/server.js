require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR);
}

// In-memory data store for active sessions
const sessions = new Map(); // Map<sessionId, { mentorWs: WebSocket, learners: Map<learnerId, { ws: WebSocket, name: string, code: string, task: string }> }>

// Helper to generate unique IDs
const generateUniqueId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const getGravatarUrl = (email) => {
    const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
};

wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', async message => {
        try {
            const parsedMessage = JSON.parse(message);
            const { type, payload } = parsedMessage;

            switch (type) {
                case 'createSession': {
                const { secret } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
                    ws.send(JSON.stringify({ type: 'authFailed', payload: { error: 'Unauthorized: Invalid secret' } }));
                    return;
                }
                const sessionId = generateUniqueId();
                sessions.set(sessionId, {
                    mentorWs: ws,
                    learners: new Map(),
                    tasks: new Map(), // Map<taskId, { content: string, assignedTo: string[] }>
                    leaderboard: [], // { learnerId, correctness, speed }
                    isCodingEnabled: true // Default to enabled
                });
                ws.send(JSON.stringify({ type: 'sessionCreated', payload: { sessionId } }));
                console.log(`Session created: ${sessionId}`);
                break;
            }
            case 'joinSession': {
                const { sessionId, role, name, secret } = payload;
                const session = sessions.get(sessionId);

                if (!session) {
                    ws.send(JSON.stringify({ type: 'sessionNotFound', payload: { error: 'Session not found' } }));
                    return;
                }

                if (role === 'mentor') {
                    if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
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
                        gravatar: learner.gravatar
                    }));
                    ws.send(JSON.stringify({ type: 'sessionState', payload: { learners: learnersData, tasks: Array.from(session.tasks.values()), leaderboard: session.leaderboard, isCodingEnabled: session.isCodingEnabled } }));
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
                        ws.send(JSON.stringify({ type: 'sessionJoined', payload: { sessionId, role, learnerId, gravatar: existingLearner.gravatar, isCodingEnabled: session.isCodingEnabled } }));
                        // Notify mentor about the re-connection
                        if (session.mentorWs) {
                            session.mentorWs.send(JSON.stringify({ type: 'learnerReconnected', payload: { id: learnerId, name, code: existingLearner.code, task: existingLearner.task, gravatar: existingLearner.gravatar } }));
                        }
                    } else {
                        // New learner
                        learnerId = generateUniqueId();
                        const gravatar = getGravatarUrl(name + '@example.com'); // Using name as a substitute for email
                        session.learners.set(learnerId, { ws, name, code: '', task: '', gravatar });
                        ws.send(JSON.stringify({ type: 'sessionJoined', payload: { sessionId, role, learnerId, gravatar, isCodingEnabled: session.isCodingEnabled } }));
                        // Notify mentor about new learner
                        if (session.mentorWs) {
                            session.mentorWs.send(JSON.stringify({ type: 'learnerJoined', payload: { id: learnerId, name, code: '', task: '', gravatar } }));
                        }
                        console.log(`Learner ${name} joined session: ${sessionId}`);
                    }
                }
                break;
            }
            case 'codeChange': {
                const { sessionId, learnerId, code } = payload;
                const session = sessions.get(sessionId);
                if (session && session.learners.has(learnerId)) {
                    session.learners.get(learnerId).code = code;
                    // Broadcast code change to mentor
                    if (session.mentorWs) {
                        session.mentorWs.send(JSON.stringify({ type: 'learnerCodeChange', payload: { learnerId, code } }));
                    }
                }
                break;
            }
            case 'submitCode': {
                const { sessionId, learnerId, code, task } = payload;
                const session = sessions.get(sessionId);
                if (session && session.learners.has(learnerId)) {
                    // Notify mentor about code submission
                    if (session.mentorWs) {
                        session.mentorWs.send(JSON.stringify({ type: 'codeSubmitted', payload: { learnerId, code, task } }));
                    }
                    // Disable coding for the learner after submission
                    const learner = session.learners.get(learnerId);
                    if (learner) {
                        learner.ws.send(JSON.stringify({ type: 'codingDisabled' }));
                    }
                }
                break;
            }
            case 'assignTask': {
                const { sessionId, taskId, content, learnerIds, secret, language } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
                    return;
                }
                const session = sessions.get(sessionId);
                if (session && session.mentorWs === ws) {
                    session.tasks.set(taskId, { content, assignedTo: learnerIds, language });
                    learnerIds.forEach(id => {
                        const learner = session.learners.get(id);
                        if (learner) {
                            learner.task = content; // Assign task content to learner
                            learner.language = language;
                            learner.ws.send(JSON.stringify({ type: 'taskAssigned', payload: { taskId, content, language } }));
                        }
                    });
                    // Notify mentor dashboard
                    ws.send(JSON.stringify({ type: 'taskAssignedConfirmation', payload: { taskId, content, learnerIds, language } }));
                }
                break;
            }
            case 'kickParticipant': {
                const { sessionId, participantId, secret } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
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
                break;
            }
            case 'banParticipant': {
                // For simplicity, banning will just kick and prevent rejoining for the current session instance.
                // In a real app, this would involve persistent storage of banned IDs.
                const { sessionId, participantId, secret } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
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
                break;
            }
            case 'evaluateCode':
                handleEvaluateCode(ws, payload);
                break;
            case 'exportSession': {
                const { sessionId, secret } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
                    return;
                }
                const session = sessions.get(sessionId);
                if (session && session.mentorWs === ws) {
                    const sessionData = {
                        learners: Array.from(session.learners.entries()).map(([id, learner]) => ({
                            id,
                            name: learner.name,
                            code: learner.code,
                            task: learner.task,
                            gravatar: learner.gravatar
                        })),
                        tasks: Array.from(session.tasks.entries()),
                        leaderboard: session.leaderboard
                    };
                    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
                    fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), err => {
                        if (err) {
                            console.error('Failed to export session:', err);
                            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Failed to export session' } }));
                        } else {
                            console.log(`Session ${sessionId} exported to ${filePath}`);
                            ws.send(JSON.stringify({ type: 'sessionExported', payload: { sessionId, filePath: `${sessionId}.json` } }));
                        }
                    });
                }
                break;
            }
            case 'importSession': {
                const { sessionId, fileContent, secret } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
                    return;
                }
                try {
                    const sessionData = JSON.parse(fileContent);
                    const newSession = {
                        mentorWs: ws,
                        learners: new Map(sessionData.learners.map(l => [l.id, { ...l, ws: null }])), // WS will be re-established on rejoin
                        tasks: new Map(sessionData.tasks),
                        leaderboard: sessionData.leaderboard || []
                    };
                    sessions.set(sessionId, newSession);
                    ws.send(JSON.stringify({ type: 'sessionImported', payload: { sessionId } }));
                    // Send current session state to mentor
                    const learnersData = Array.from(newSession.learners.entries()).map(([id, learner]) => ({
                        id,
                        name: learner.name,
                        code: learner.code,
                        task: learner.task,
                        gravatar: learner.gravatar
                    }));
                    ws.send(JSON.stringify({ type: 'sessionState', payload: { learners: learnersData, tasks: Array.from(newSession.tasks.values()), leaderboard: newSession.leaderboard } }));
                    console.log(`Session ${sessionId} imported.`);
                } catch (error) {
                    console.error('Failed to import session:', error);
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Failed to import session' } }));
                }
                break;
            }
            case 'toggleCoding': {
                const { sessionId, secret } = payload;
                if (secret !== process.env.MENTOR_SECRET_KEY) {
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
                    return;
                }
                const session = sessions.get(sessionId);
                if (session && session.mentorWs === ws) {
                    session.isCodingEnabled = !session.isCodingEnabled;
                    const message = { type: session.isCodingEnabled ? 'codingEnabled' : 'codingDisabled' };
                    session.learners.forEach(learner => {
                        if (learner.ws) {
                            learner.ws.send(JSON.stringify(message));
                        }
                    });
                    // Also notify the mentor about the state change
                    ws.send(JSON.stringify({ type: 'codingToggled', payload: { isCodingEnabled: session.isCodingEnabled } }));
                }
                break;
            }
            default:
                console.log('Unknown message type:', type);
            }
        } catch (error) {
            console.error("Failed to process message:", message, "Error:", error);
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
        }
    });

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
});

async function handleEvaluateCode(ws, payload) {
    const { sessionId, learnerId, secret } = payload;
    if (secret !== process.env.MENTOR_SECRET_KEY) { // Simple shared secret
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Unauthorized: Invalid secret' } }));
        return;
    }
    const session = sessions.get(sessionId);
    if (session && session.mentorWs === ws) {
        const learner = session.learners.get(learnerId);
        if (learner) {
            const startTime = Date.now();
            console.log(`Evaluating code for learner ${learner.name}: ${learner.code}`);
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = `Evaluate the following code snippet for correctness and provide detailed feedback. Assign a score out of 100.
                Code:
                ${learner.code}
                
                Task:
                ${payload.task || learner.task || 'No specific task provided. Evaluate general code quality.'}
                
                Provide the response in a JSON format with 'score' (integer) and 'feedback' (string) fields.`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                let evaluationResult;
                try {
                    evaluationResult = JSON.parse(text);
                } catch (parseError) {
                    console.error('Failed to parse Gemini response as JSON:', text, parseError);
                    evaluationResult = {
                        score: 0,
                        feedback: `Gemini response could not be parsed. Raw response: ${text}`
                    };
                }

                const endTime = Date.now();
                const speed = (endTime - startTime) / 1000; // in seconds

                // Update leaderboard
                const leaderboardEntry = { name: learner.name, score: evaluationResult.score, speed };
                const existingEntryIndex = session.leaderboard.findIndex(e => e.name === learner.name);
                if (existingEntryIndex > -1) {
                    session.leaderboard[existingEntryIndex] = leaderboardEntry;
                } else {
                    session.leaderboard.push(leaderboardEntry);
                }

                learner.ws.send(JSON.stringify({ type: 'evaluationResult', payload: evaluationResult }));
                ws.send(JSON.stringify({ type: 'evaluationComplete', payload: { learnerId, result: evaluationResult } }));
                // Broadcast leaderboard update
                if (session.mentorWs) {
                    session.mentorWs.send(JSON.stringify({ type: 'leaderboardUpdate', payload: { leaderboard: session.leaderboard } }));
                }
            } catch (geminiError) {
                console.error('Error calling Gemini API:', geminiError);
                const errorResult = {
                    score: 0,
                    feedback: `Error during evaluation: ${geminiError.message}`
                };
                learner.ws.send(JSON.stringify({ type: 'evaluationResult', payload: errorResult }));
                ws.send(JSON.stringify({ type: 'evaluationComplete', payload: { learnerId, result: errorResult } }));
            }
        }
    }
}

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});