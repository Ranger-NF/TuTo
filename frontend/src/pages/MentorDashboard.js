import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import Editor from '@monaco-editor/react';
import Leaderboard from '../components/Leaderboard';
import { FaCrown } from 'react-icons/fa';
import './MentorDashboard.css';

const MentorDashboard = () => {
    const { sessionId: paramSessionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { secret, action } = location.state || {};
    const { messages, sendMessage, isConnected } = useWebSocket();
    const [learners, setLearners] = useState([]);
    const [selectedLearnerId, setSelectedLearnerId] = useState(null);
    const selectedLearner = learners.find(l => l.id === selectedLearnerId);
    const [leaderboard, setLeaderboard] = useState([]);
    const [activeTask, setActiveTask] = useState('');
    const [submittedCode, setSubmittedCode] = useState(new Set());
    const [displaySessionId, setDisplaySessionId] = useState(paramSessionId);
    const [isCodingEnabled, setIsCodingEnabled] = useState(false);
    const [quizState, setQuizState] = useState('idle');
    const [isRoundRunning, setIsRoundRunning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [taskContent, setTaskContent] = useState('');
    const [taskLanguage, setTaskLanguage] = useState('javascript');
    const [taskTimeLimit, setTaskTimeLimit] = useState(300);


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
                    sendMessage({ type: 'joinSession', payload: { sessionId: lastMessage.payload.sessionId, role: 'mentor', secret: secret } });
                    break;
                case 'sessionState':
                    setLearners(lastMessage.payload.learners || []);
                    setLeaderboard(lastMessage.payload.leaderboard || []);
                    setIsCodingEnabled(lastMessage.payload.isCodingEnabled);
                    if (lastMessage.payload.currentTask) {
                        setActiveTask(lastMessage.payload.currentTask.content);
                    }
                    if (lastMessage.payload.quizState) {
                        setQuizState(lastMessage.payload.quizState);
                    }
                    break;
                case 'codingToggled':
                    setIsCodingEnabled(lastMessage.payload.isCodingEnabled);
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
               case 'quizRoundStartedConfirmation':
                   setQuizState('running');
                   break;
               case 'quizRoundFinished':
                   setQuizState('finished');
                   setTimeRemaining(0);
                   break;
                case 'timerUpdate':
                    setTimeRemaining(lastMessage.payload.timeRemaining);
                    break;
               case 'finalLeaderboard':
                   setLeaderboard(lastMessage.payload.leaderboard);
                   setQuizState('finished');
                   setTimeRemaining(null);
                   // Trigger confetti
                   break;
                default:
                    break;
            }
        }
    }, [messages, secret, sendMessage, navigate, selectedLearnerId]);

    const handleAssignTask = () => {
        if (!taskContent.trim()) {
            alert('Please enter a task.');
            return;
        }
        const learnerIds = learners.map(l => l.id);
        if (learnerIds.length === 0) {
            alert('No learners in the session to assign the task to.');
            return;
        }
        const taskId = `task-${new Date().getTime()}`;
        sendMessage({
            type: 'assignTask',
            payload: {
                sessionId: displaySessionId,
                taskId,
                content: taskContent,
                learnerIds,
                secret,
                language: taskLanguage,
                timeLimit: parseInt(taskTimeLimit, 10)
            }
        });
    };

    const handleStartRound = () => {
        sendMessage({ type: 'startQuizRound', payload: { sessionId: displaySessionId, secret } });
    };

    const handleStopRound = () => {
        sendMessage({ type: 'stopQuizRound', payload: { sessionId: displaySessionId, secret } });
    };

    const handleToggleRound = () => {
        const newRoundState = !isRoundRunning;
        setIsRoundRunning(newRoundState);
        if (newRoundState) {
            handleStartRound();
        } else {
            handleStopRound();
        }
    };

    const handleResetSession = () => {
        sendMessage({ type: 'resetSession', payload: { sessionId: displaySessionId, secret } });
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
                    {timeRemaining !== null && (
                        <div className="timer">
                            Time Remaining: {Math.round(timeRemaining)}s
                        </div>
                    )}
                </div>
            </header>
            <div className="main-content">
                <div className="sidebar left-sidebar">
                    <Leaderboard learners={learners} leaderboard={leaderboard} />
                </div>
                <div className="code-editor-container">
                    {selectedLearner ? (
                        <Editor
                            height="100%"
                            language={selectedLearner.language || 'javascript'}
                            theme="vs-dark"
                            value={selectedLearner.code}
                            options={{ readOnly: true, minimap: { enabled: false } }}
                        />
                    ) : (
                        <div className="placeholder-view">
                            <div>
                                <h2>Select a learner</h2>
                                <p>Click on a learner from the gallery below to view their code.</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="sidebar right-sidebar">
                    {activeTask && (
                        <div className="current-task-display">
                            <h3>Current Task</h3>
                            <p>{activeTask}</p>
                        </div>
                    )}
                    <div className="global-controls">
                        <h3>Global Controls</h3>
                        <div className="task-controls">
                            <textarea
                                value={taskContent}
                                onChange={(e) => setTaskContent(e.target.value)}
                                placeholder="Enter task description..."
                                disabled={isRoundRunning}
                            />
                            <input
                                type="text"
                                value={taskLanguage}
                                onChange={(e) => setTaskLanguage(e.target.value)}
                                placeholder="Language (e.g., javascript)"
                                disabled={isRoundRunning}
                            />
                            <input
                                type="number"
                                value={taskTimeLimit}
                                onChange={(e) => setTaskTimeLimit(e.target.value)}
                                placeholder="Time limit in seconds"
                                disabled={isRoundRunning}
                            />
                            <button onClick={handleAssignTask} disabled={isRoundRunning}>Assign Task</button>
                        </div>
                        <div className="quiz-controls">
                            <button onClick={handleToggleRound} className={isRoundRunning ? "stop-round-btn" : "start-round-btn"}>
                                {isRoundRunning ? 'Stop Round' : 'Start Round'}
                            </button>
                            <button onClick={handleResetSession} className="reset-session-btn">
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="participant-gallery">
                {learners.filter(l => l.role !== 'mentor').map(learner => (
                    <div key={learner.id} className={`participant-tile ${selectedLearnerId === learner.id ? 'active' : ''}`} onClick={() => setSelectedLearnerId(learner.id)}>
                        <div className="participant-info">
                            {learner.gravatar && <img src={learner.gravatar} alt={learner.name} />}
                            <span>{learner.name}</span>
                            <span className={getStatusIndicator(learner)}></span>
                            {submittedCode.has(learner.id) && <FaCrown title="Submitted" style={{ color: 'gold', marginLeft: 'auto' }} />}
                        </div>
                        <div className="code-preview">
                            <Editor
                                height="100%"
                                language={learner.language || 'javascript'}
                                value={learner.code}
                                theme="vs-dark"
                                options={{ readOnly: true, minimap: { enabled: false }, lineNumbers: 'off', scrollBeyondLastLine: false }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MentorDashboard;