// In-memory data store for active sessions
const sessions = new Map(); // Map<sessionId, { mentorWs: WebSocket, learners: Map<learnerId, { ws: WebSocket, name: string, code: string, task: string }> }>

module.exports = {
    sessions,
};