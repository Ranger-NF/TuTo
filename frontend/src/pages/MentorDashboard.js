import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import Editor from '@monaco-editor/react';
import Leaderboard from '../components/Leaderboard';
import { FaCrown, FaFileExport, FaFileImport, FaPaperPlane, FaTimes, FaUserSlash } from 'react-icons/fa';

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
    const [language, setLanguage] = useState('javascript');
    const [activeTask, setActiveTask] = useState(null);


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
                    setLearners(prev => prev.map(l => l.id === lastMessage.payload.learnerId ? { ...l, code: lastMessage.payload.code, status: 'active' } : l));
                    break;
                case 'leaderboardUpdate':
                    setLeaderboard(lastMessage.payload.leaderboard);
                    break;
                case 'codeSubmitted':
                    setSubmittedCode(prev => new Set(prev).add(lastMessage.payload.learnerId));
                    setLearners(prev => prev.map(l => l.id === lastMessage.payload.learnerId ? { ...l, status: 'submitted' } : l));
                    break;
                case 'evaluationResult':
                     setLearners(prev => prev.map(l => l.id === lastMessage.payload.learnerId ? { ...l, status: lastMessage.payload.isCorrect ? 'correct' : 'error' } : l));
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
            sendMessage({ type: 'assignTask', payload: { sessionId: displaySessionId, taskId, content: task, learnerIds, secret, language } });
            setActiveTask(taskId);
        }
    };

    const handleEvaluateCode = () => {
        if (selectedLearner) {
            sendMessage({ type: 'evaluateCode', payload: { sessionId, learnerId: selectedLearner.id, secret } });
        }
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                sendMessage({ type: 'importSession', payload: { sessionId, fileContent: e.target.result, secret } });
            };
            reader.readAsText(file);
        }
    };

    const getStatusIndicator = (learner) => {
        switch (learner.status) {
            case 'correct': return 'status-indicator success';
            case 'error': return 'status-indicator error';
            case 'submitted': return 'status-indicator submitted';
            default: return 'status-indicator active';
        }
    };

    return (
        <div className="container">
            <header className="app-header">
                <h1>Mentor Dashboard</h1>
                <div className="session-info">
                    <span>Session ID: {displaySessionId}</span>
                </div>
                <div className="header-controls">
                    <label htmlFor="import-session" className="icon-button">
                        <FaFileImport />
                    </label>
                    <input id="import-session" type="file" onChange={handleImport} style={{ display: 'none' }} />
                    <button className="icon-button" onClick={() => sendMessage({ type: 'exportSession', payload: { sessionId, secret } })}>
                        <FaFileExport />
                    </button>
                </div>
            </header>
            <div className="main-content">
                <div className="code-editor-container">
                    {selectedLearner ? (
                        <div style={{ height: '100%' }}>
                            <Editor
                                height="100%"
                                language={language}
                                theme="vs-dark"
                                value={selectedLearner.code}
                                options={{ readOnly: true, minimap: { enabled: false } }}
                            />
                        </div>
                    ) : (
                        <div className="placeholder-view">
                            <h2>Select a learner to view their code</h2>
                        </div>
                    )}
                </div>
                <div className="sidebar">
                    <div className="task-assignment">
                        <h3>Assign Task</h3>
                        <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="Describe the task..." />
                        <div className="language-selector">
                            <label htmlFor="language">Language:</label>
                            <select id="language" value={language} onChange={e => setLanguage(e.target.value)}>
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                            </select>
                        </div>
                        <div className="task-buttons">
                            <button onClick={() => handleAssignTask()} disabled={!selectedLearner || activeTask}>
                                <FaPaperPlane /> Assign to Selected
                            </button>
                            <button onClick={() => handleAssignTask(true)} disabled={activeTask}>
                                <FaPaperPlane /> Assign to All
                            </button>
                        </div>
                    </div>
                    {selectedLearner && (
                        <div className="learner-controls">
                            <h3>Controls for {selectedLearner.name}</h3>
                            <button onClick={handleEvaluateCode}>Evaluate Code</button>
                            <button onClick={() => sendMessage({ type: 'startCoding', payload: { sessionId: displaySessionId, learnerId: selectedLearner.id, secret } })}>Start Coding</button>
                            <button onClick={() => sendMessage({ type: 'stopCoding', payload: { sessionId: displaySessionId, learnerId: selectedLearner.id, secret } })}>Stop Coding</button>
                            <button className="control-button kick" onClick={() => sendMessage({ type: 'kickParticipant', payload: { sessionId: displaySessionId, participantId: selectedLearner.id, secret } })}>
                                <FaTimes /> Kick
                            </button>
                            <button className="control-button ban" onClick={() => sendMessage({ type: 'banParticipant', payload: { sessionId: displaySessionId, participantId: selectedLearner.id, secret } })}>
                                <FaUserSlash /> Ban
                            </button>
                        </div>
                    )}
                    <Leaderboard leaderboard={leaderboard} />
                </div>
            </div>
            <div className="participant-gallery">
                {learners.filter(l => l.role !== 'mentor').map(learner => (
                    <div key={learner.id} className={`participant-tile ${selectedLearnerId === learner.id ? 'active' : ''}`} onClick={() => setSelectedLearnerId(learner.id)}>
                        <div className="participant-info">
                            {learner.gravatar && <img src={learner.gravatar} alt={learner.name} />}
                            <span>{learner.name}</span>
                            <span className={getStatusIndicator(learner)}></span>
                            {submittedCode.has(learner.id) && <FaCrown title="Submitted" />}
                        </div>
                        <div className="code-preview" style={{ backgroundColor: '#1e1e1e' }}>
                            <Editor
                                height="100px"
                                language={learner.language || 'javascript'}
                                value={learner.code}
                                theme="vs-dark"
                                options={{ readOnly: true, minimap: { enabled: false }, lineNumbers: 'off' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MentorDashboard;