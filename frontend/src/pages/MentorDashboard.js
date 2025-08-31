import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import Editor from '@monaco-editor/react';
import Leaderboard from '../components/Leaderboard';

const MentorDashboard = () => {
    const { sessionId: paramSessionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { secret, action } = location.state || {};
    const { messages, sendMessage, isConnected, sessionId } = useWebSocket();
    const [learners, setLearners] = useState([]);
    const [selectedLearnerId, setSelectedLearnerId] = useState(null);
    const selectedLearner = learners.find(l => l.id === selectedLearnerId);
    const [task, setTask] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [submittedCode, setSubmittedCode] = useState(new Set());
    const [displaySessionId, setDisplaySessionId] = useState(paramSessionId);

    useEffect(() => {
        if (isConnected && secret) {
            if (action === 'create') {
                sendMessage({ type: 'createSession', payload: { secret } });
            } else if (action === 'join') {
                sendMessage({ type: 'joinSession', payload: { sessionId: paramSessionId, role: 'mentor', secret } });
            }
        }
    }, [isConnected, paramSessionId, secret, sendMessage, action]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            switch (lastMessage.type) {
                case 'sessionCreated':
                    setDisplaySessionId(lastMessage.payload.sessionId);
                    window.history.replaceState(null, '', `/mentor/${lastMessage.payload.sessionId}`);
                    sendMessage({ type: 'joinSession', payload: { sessionId: lastMessage.payload.sessionId, role: 'mentor', secret } });
                    break;
                case 'sessionState':
                    setLearners(lastMessage.payload.learners || []);
                    setLeaderboard(lastMessage.payload.leaderboard || []);
                    break;
                case 'authFailed':
                    alert(lastMessage.payload.error);
                    navigate('/');
                    break;
                case 'learnerJoined':
                    setLearners(prev => {
                        if (prev.some(l => l.id === lastMessage.payload.id)) {
                            return prev;
                        }
                        return [...prev, lastMessage.payload];
                    });
                    break;
                case 'learnerDisconnected':
                    if (selectedLearnerId === lastMessage.payload.learnerId) {
                        setSelectedLearnerId(null);
                    }
                    setLearners(prev => prev.filter(l => l.id !== lastMessage.payload.learnerId));
                    break;
                case 'learnerCodeChange':
                    setLearners(prev => prev.map(l => l.id === lastMessage.payload.learnerId ? { ...l, code: lastMessage.payload.code } : l));
                    break;
                case 'leaderboardUpdate':
                    setLeaderboard(lastMessage.payload.leaderboard);
                    break;
                case 'codeSubmitted':
                    setSubmittedCode(prev => new Set(prev).add(lastMessage.payload.learnerId));
                    break;
                default:
                    break;
            }
        }
    }, [messages, secret, sendMessage, navigate, selectedLearnerId]);

    const handleAssignTask = (all = false) => {
        const taskId = `task-${Date.now()}`;
        const learnerIds = all ? learners.map(l => l.id) : (selectedLearner ? [selectedLearner.id] : []);
        if (learnerIds.length > 0) {
            sendMessage({ type: 'assignTask', payload: { sessionId, taskId, content: task, learnerIds, secret } });
        }
    };

    const handleEvaluateCode = () => {
        if (selectedLearner) {
            sendMessage({ type: 'evaluateCode', payload: { sessionId, learnerId: selectedLearner.id, secret } });
        }
    };

    return (
        <div>
            <h1>Mentor Dashboard</h1>
            <h2>Session ID: {displaySessionId}</h2>
            <div>
                <h3>Connected Learners</h3>
                <ul>
                    {learners.filter(learner => learner.role !== 'mentor').map(learner => (
                        <li key={learner.id} onClick={() => setSelectedLearnerId(learner.id)}>
                            {learner.gravatar && <img src={learner.gravatar} alt={learner.name} width="20" height="20" />}
                            {learner.name} {submittedCode.has(learner.id) && ' (Submitted)'}
                        </li>
                    ))}
                </ul>
            </div>
            {selectedLearner && (
                <div>
                    <h3>{selectedLearner.name}'s Code</h3>
                    <Editor
                        height="50vh"
                        language="javascript"
                        value={selectedLearner.code}
                        options={{ readOnly: true }}
                    />
                    <div>
                        <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="Assign a new task..." />
                        <button onClick={() => handleAssignTask()}>Assign to Selected</button>
                        <button onClick={() => handleAssignTask(true)}>Assign to All</button>
                    </div>
                    <button onClick={handleEvaluateCode}>Evaluate Code</button>
                    <button onClick={() => sendMessage({ type: 'kickParticipant', payload: { sessionId, participantId: selectedLearner.id, secret } })}>Kick</button>
                    <button onClick={() => sendMessage({ type: 'banParticipant', payload: { sessionId, participantId: selectedLearner.id, secret } })}>Ban</button>
                </div>
            )}
            <div>
                <h3>Session Management</h3>
                <button onClick={() => sendMessage({ type: 'exportSession', payload: { sessionId, secret } })}>Export Session</button>
                <input type="file" onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            sendMessage({ type: 'importSession', payload: { sessionId, fileContent: event.target.result, secret } });
                        };
                        reader.readAsText(file);
                    }
                }} />
            </div>
            <Leaderboard leaderboard={leaderboard} />
        </div>
    );
};

export default MentorDashboard;