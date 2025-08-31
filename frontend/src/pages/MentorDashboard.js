import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import Editor from '@monaco-editor/react';
import Leaderboard from '../components/Leaderboard';

const MentorDashboard = () => {
    const { sessionId } = useParams();
    const location = useLocation();
    const secret = new URLSearchParams(location.search).get('secret');
    const { messages, sendMessage, isConnected } = useWebSocket('ws://localhost:3001');
    const [learners, setLearners] = useState([]);
    const [selectedLearner, setSelectedLearner] = useState(null);
    const [task, setTask] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        if (isConnected) {
            if (sessionId === 'new-session') {
                sendMessage({ type: 'createSession', payload: { secret } });
            } else {
                sendMessage({ type: 'joinSession', payload: { sessionId, role: 'mentor', secret } });
            }
        }
    }, [isConnected, sessionId, secret, sendMessage]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            switch (lastMessage.type) {
                case 'sessionCreated':
                    window.history.replaceState(null, '', `/mentor/${lastMessage.payload.sessionId}`);
                    sendMessage({ type: 'joinSession', payload: { sessionId: lastMessage.payload.sessionId, role: 'mentor', secret } });
                    break;
                case 'sessionState':
                    setLearners(lastMessage.payload.learners);
                    setLeaderboard(lastMessage.payload.leaderboard || []);
                    break;
                case 'learnerJoined':
                    setLearners(prev => [...prev, lastMessage.payload]);
                    break;
                case 'learnerDisconnected':
                    setLearners(prev => prev.filter(l => l.id !== lastMessage.payload.learnerId));
                    break;
                case 'learnerCodeChange':
                    setLearners(prev => prev.map(l => l.id === lastMessage.payload.learnerId ? { ...l, code: lastMessage.payload.code } : l));
                    if (selectedLearner && selectedLearner.id === lastMessage.payload.learnerId) {
                        setSelectedLearner(prev => ({ ...prev, code: lastMessage.payload.code }));
                    }
                    break;
                case 'leaderboardUpdate':
                    setLeaderboard(lastMessage.payload.leaderboard);
                    break;
                default:
                    break;
            }
        }
    }, [messages, secret, sendMessage, selectedLearner]);

    const handleAssignTask = () => {
        if (selectedLearner) {
            const taskId = `task-${Date.now()}`;
            sendMessage({ type: 'assignTask', payload: { sessionId, taskId, content: task, learnerIds: [selectedLearner.id], secret } });
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
            <h2>Session ID: {sessionId}</h2>
            <div>
                <h3>Connected Learners</h3>
                <ul>
                    {learners.map(learner => (
                        <li key={learner.id} onClick={() => setSelectedLearner(learner)}>
                            {learner.name}
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
                        <button onClick={handleAssignTask}>Assign Task</button>
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