import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
    const [role, setRole] = useState('learner');
    const [sessionId, setSessionId] = useState('');
    const [name, setName] = useState('');
    const [secret, setSecret] = useState('');
    const navigate = useNavigate();

    const handleJoin = () => {
        if (role === 'mentor') {
            if (secret && sessionId) {
                navigate(`/mentor/${sessionId}`, { state: { secret, action: 'join' } });
            } else {
                alert('Please enter a session ID and the mentor secret.');
            }
        } else {
            if (sessionId && name) {
                navigate(`/learner/${sessionId}?name=${name}`);
            } else {
                alert('Please enter a session ID and your name.');
            }
        }
    };

    const handleCreateSession = () => {
        if (secret) {
            navigate(`/mentor/new-session`, { state: { secret, action: 'create' } });
        } else {
            alert('Please enter the mentor secret to create a session.');
        }
    };

    return (
        <div>
            <h1>Tuto</h1>
            <div>
                <label>
                    <input type="radio" value="learner" checked={role === 'learner'} onChange={() => setRole('learner')} />
                    Learner
                </label>
                <label>
                    <input type="radio" value="mentor" checked={role === 'mentor'} onChange={() => setRole('mentor')} />
                    Mentor
                </label>
            </div>
            {role === 'learner' ? (
                <div>
                    <input type="text" placeholder="Enter Session ID" value={sessionId} onChange={e => setSessionId(e.target.value)} />
                    <input type="text" placeholder="Enter Your Name" value={name} onChange={e => setName(e.target.value)} />
                </div>
            ) : (
                <div>
                    <input type="password" placeholder="Enter Mentor Secret" value={secret} onChange={e => setSecret(e.target.value)} />
                    <input type="text" placeholder="Enter Session ID to Join" value={sessionId} onChange={e => setSessionId(e.target.value)} />
                     <button onClick={handleJoin}>Join Session</button>
                    <button onClick={handleCreateSession}>Create New Session</button>
                </div>
            )}
            {role === 'learner' && <button onClick={handleJoin}>Join Session</button>}
        </div>
    );
};

export default HomePage;