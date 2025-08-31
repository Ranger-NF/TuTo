import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebSocketContext } from '../context/WebSocketContext';
import './HomePage.css';

const HomePage = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);
    const [secret, setSecret] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const { sendMessage, messages } = useContext(WebSocketContext);
    const navigate = useNavigate();

    useEffect(() => {
        const storedName = localStorage.getItem('name');
        if (storedName) {
            setName(storedName);
        }

        const sessionCreatedMessage = messages.find(msg => msg.type === 'sessionCreated');
        if (sessionCreatedMessage) {
            navigate(`/mentor/${sessionCreatedMessage.payload.sessionId}`, { state: { secret } });
        }

        const joinedSessionMessage = messages.find(msg => msg.type === 'sessionJoined');
        if (joinedSessionMessage && joinedSessionMessage.payload.role === 'learner') {
            navigate(`/learner/${joinedSessionMessage.payload.sessionId}?name=${name}`);
        }

        const authFailedMessage = messages.find(msg => msg.type === 'authFailed');
        if (authFailedMessage) {
            setError(authFailedMessage.payload.error);
        }
        const sessionNotFoundMessage = messages.find(msg => msg.type === 'sessionNotFound');
        if (sessionNotFoundMessage) {
            setError(sessionNotFoundMessage.payload.error);
        }
    }, [messages, navigate, secret, name]);

    const handleCreateSession = () => {
        sendMessage({
            type: 'createSession',
            payload: { secret },
        });
    };

    const handleJoinClick = () => {
        if (name) {
            handleJoinSession();
        } else {
            setShowNameModal(true);
        }
    };

    const handleJoinSession = () => {
        if (name) {
            localStorage.setItem('name', name);
            sendMessage({
                type: 'joinSession',
                payload: { sessionId, role: 'learner', name },
            });
            setShowNameModal(false);
        }
    };

    return (
        <div className="home-container">
            <h1 className="title">Tuto</h1>
            <div className="join-session-container">
                <input
                    type="text"
                    placeholder="Enter session ID"
                    className="session-input"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                />
                <button onClick={handleJoinClick} className="join-button">Join</button>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="create-session-link">
                Create your own session
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="chevron-arrow"
                >
                    <path d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
            </button>

            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Create Session</h2>
                        <p>Enter the mentor secret to create a new session.</p>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="Enter Mentor Secret"
                        />
                        <button onClick={handleCreateSession}>Create</button>
                        <button className="modal-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                        {error && <p className="error-message">{error}</p>}
                    </div>
                </div>
            )}

            {showNameModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Enter Your Name</h2>
                        <p>Please enter your name to join the session.</p>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter Your Name"
                        />
                        <button onClick={handleJoinSession}>Join</button>
                        <button className="modal-cancel" onClick={() => setShowNameModal(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;