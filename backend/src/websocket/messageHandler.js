const {
    handleCreateSession,
    handleJoinSession,
    handleCodeChange,
    handleSubmitCode,
    handleAssignTask,
    handleStartQuizRound,
    handleStopQuizRound,
    handleStopSession,
    handleKickParticipant,
    handleBanParticipant,
    handleExportSession,
    handleImportSession,
    handleToggleCoding,
    handleResetSession,
} = require('./handlers');

async function handleMessage(ws, message) {
    try {
        const parsedMessage = JSON.parse(message);
        const { type, payload } = parsedMessage;

        switch (type) {
            case 'createSession':
                handleCreateSession(ws, payload);
                break;
            case 'joinSession':
                handleJoinSession(ws, payload);
                break;
            case 'codeChange':
                handleCodeChange(ws, payload);
                break;
            case 'submitCode':
                handleSubmitCode(ws, payload);
                break;
            case 'assignTask':
                handleAssignTask(ws, payload);
                break;
            case 'startQuizRound':
                handleStartQuizRound(ws, payload);
                break;
            case 'stopQuizRound':
                handleStopQuizRound(ws, payload);
                break;
            case 'stopSession':
                handleStopSession(ws, payload);
                break;
            case 'kickParticipant':
                handleKickParticipant(ws, payload);
                break;
            case 'banParticipant':
                handleBanParticipant(ws, payload);
                break;
            case 'exportSession':
                handleExportSession(ws, payload);
                break;
            case 'importSession':
                handleImportSession(ws, payload);
                break;
            case 'toggleCoding':
                handleToggleCoding(ws, payload);
                break;
            case 'resetSession':
                handleResetSession(ws, payload);
                break;
            default:
                console.log('Unknown message type:', type);
        }
    } catch (error) {
        console.error("Failed to process message:", message, "Error:", error);
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
    }
}

module.exports = handleMessage;