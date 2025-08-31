import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import Editor from '@monaco-editor/react';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';
import Confetti from 'react-confetti';
import './LearnerPage.css';

const LearnerPage = () => {
    const { sessionId } = useParams();
    const location = useLocation();
    const name = new URLSearchParams(location.search).get('name');
    const { messages, sendMessage, isConnected } = useWebSocket();
    const [code, setCode] = useState('// Start coding here...');
    const [task, setTask] = useState('');
    const [evaluation, setEvaluation] = useState(null);
    const [learnerId, setLearnerId] = useState(null);
    const [gravatar, setGravatar] = useState('');
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [isEditorReadOnly, setEditorReadOnly] = useState(true);
    const [language, setLanguage] = useState('javascript');
    const [statusMessage, setStatusMessage] = useState('Waiting for host to start the session...');
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
    const [finalLeaderboard, setFinalLeaderboard] = useState([]);


    useEffect(() => {
        if (isConnected) {
            sendMessage({ type: 'joinSession', payload: { sessionId, role: 'learner', name } });
        }
    }, [isConnected, sessionId, name, sendMessage]);

    const [submittedTask, setSubmittedTask] = useState(null);


    const [countdown, setCountdown] = useState(null);


    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            switch (lastMessage.type) {
                case 'sessionJoined':
                    if (lastMessage.payload.role === 'learner') {
                        setLearnerId(lastMessage.payload.learnerId);
                        setGravatar(lastMessage.payload.gravatar);
                        setEditorReadOnly(!lastMessage.payload.isCodingEnabled);
                    }
                    break;
                case 'taskAssigned':
                    setTask(lastMessage.payload.content);
                    setLanguage(lastMessage.payload.language || 'javascript');
                    setEvaluation(null);
                    setShowEvaluation(false);
                    setEditorReadOnly(false); // Re-enable editor for new task
                    setSubmittedTask(null); // Reset submitted task
                    break;
                case 'quizRoundStarted':
                    setTimeRemaining(lastMessage.payload.timeLimit);
                    setCountdown(3);
                    break;
                case 'timerUpdate':
                    setTimeRemaining(lastMessage.payload.timeRemaining);
                    break;
                case 'quizRoundFinished':
                    setTimeRemaining(0);
                    break;
                case 'submissionAcknowledged':
                    setStatusMessage('Code submitted! Waiting for evaluation...');
                    break;
                case 'finalLeaderboard':
                    setFinalLeaderboard(lastMessage.payload.leaderboard);
                    setShowFinalLeaderboard(true);
                    setTimeRemaining(null);
                    break;
                case 'evaluationResult':
                    setEvaluation(lastMessage.payload);
                    setShowEvaluation(true);
                    break;
                case 'codingEnabled':
                    setEditorReadOnly(false);
                    setStatusMessage('');
                    break;
                case 'codingDisabled':
                    setEditorReadOnly(true);
                    setStatusMessage('Coding is disabled by the host.');
                    break;
                case 'sessionReset':
                    setCode('// Start coding here...');
                    setTask('');
                    setEvaluation(null);
                    setShowEvaluation(false);
                    setEditorReadOnly(true);
                    setStatusMessage('The session has been reset by the host.');
                    setTimeRemaining(null);
                    setShowFinalLeaderboard(false);
                    setFinalLeaderboard([]);
                    break;
                default:
                    break;
            }
        }
    }, [messages, sessionId, name, sendMessage]);

    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timerId);
        } else if (countdown === 0) {
            setCountdown(null);
            setEditorReadOnly(false);
            setStatusMessage('');
        }
    }, [countdown]);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        if (learnerId) {
            sendMessage({ type: 'codeChange', payload: { sessionId, learnerId, code: newCode } });
        }
    };

    const handleSubmit = () => {
        sendMessage({ type: 'submitCode', payload: { sessionId, learnerId, code, task } });
        setSubmittedTask(task);
        setEditorReadOnly(true);
        setStatusMessage('Code submitted! Waiting for evaluation...');
    };

    return (
        <div className="container learner-page">
            {countdown !== null && countdown > 0 && (
                <div className="countdown-overlay">
                    <div className="countdown-content">
                        <h2>Get Ready!</h2>
                        <p className="task-preview">{task}</p>
                        <div className="countdown-timer">{countdown}</div>
                    </div>
                </div>
            )}
            <header className="app-header">
                <div className="user-info">
                    {gravatar && <img src={gravatar} alt={name} className="avatar" />}
                    <h1>{name}</h1>
                </div>
                <button onClick={handleSubmit} className="submit-button" disabled={isEditorReadOnly}>
                    <FaPaperPlane /> Submit for Evaluation
                </button>
                {timeRemaining !== null && (
                    <div className="timer">
                        Time Remaining: {Math.round(timeRemaining)}s
                    </div>
                )}
            </header>
            <div className="main-content">
                <div className="task-and-editor">
                    {task ? (
                        <div className="task-card">
                            <h2>Task</h2>
                            <p>{task}</p>
                        </div>
                    ) : (
                        <div className="task-card">
                            <h2>Task</h2>
                            <p>Waiting for the host to assign a task.</p>
                        </div>
                    )}
                    <div className="code-editor-container">
                        {isEditorReadOnly && <div className="editor-overlay">{statusMessage}</div>}
                        <div style={{ height: '100%' }}>
                            <Editor
                                height="100%"
                                language={language}
                                theme="vs-dark"
                                value={code}
                                onChange={handleCodeChange}
                                options={{ readOnly: isEditorReadOnly || submittedTask === task, minimap: { enabled: false } }}
                            />
                        </div>
                    </div>
                </div>
                {showEvaluation && (
                    <div className={`evaluation-panel ${evaluation && (evaluation.score > 7 ? 'success' : (evaluation.score > 4 ? 'warning' : 'error'))}`}>
                        <button className="close-panel" onClick={() => setShowEvaluation(false)}>
                            <FaTimes />
                        </button>
                        <h3>Evaluation Result</h3>
                        {evaluation && (
                            <>
                                <div className="score-display">
                                    <span className="score">{evaluation.score}</span>/10
                                </div>
                                <p><strong>Feedback:</strong></p>
                                <p>{evaluation.feedback}</p>
                                {evaluation.error && <pre className="error-log">{evaluation.error}</pre>}
                            </>
                        )}
                    </div>
                )}
            </div>
            {showFinalLeaderboard && (
                <div className="final-leaderboard-overlay">
                    <Confetti />
                    <div className="final-leaderboard">
                        <h2>Final Leaderboard</h2>
                        <ol>
                            {finalLeaderboard.map((entry, index) => (
                                <li key={index}>
                                    {entry.name} - Score: {entry.score}
                                    {entry.speed !== 'N/A' && `, Time: ${entry.speed}s`}
                                </li>
                            ))}
                        </ol>
                        <button onClick={() => setShowFinalLeaderboard(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearnerPage;