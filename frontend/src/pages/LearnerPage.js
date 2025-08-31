import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import useWebSocket from '../hooks/useWebSocket';
import Editor from '@monaco-editor/react';

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

    useEffect(() => {
        if (isConnected) {
            sendMessage({ type: 'joinSession', payload: { sessionId, role: 'learner', name } });
        }
    }, [isConnected, sessionId, name, sendMessage]);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            switch (lastMessage.type) {
                case 'sessionJoined':
                    if(lastMessage.payload.role === 'learner') {
                        setLearnerId(lastMessage.payload.learnerId);
                        setGravatar(lastMessage.payload.gravatar);
                    }
                    break;
                case 'taskAssigned':
                    setTask(lastMessage.payload.content);
                    break;
                case 'evaluationResult':
                    setEvaluation(lastMessage.payload);
                    break;
                default:
                    break;
            }
        }
    }, [messages]);

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        if(learnerId) {
            sendMessage({ type: 'codeChange', payload: { sessionId, learnerId, code: newCode } });
        }
    };

    return (
        <div className="learner-page-container">
            <div>
                {gravatar && <img src={gravatar} alt={name} width="30" height="30" />}
                <h1>Learner Page for {name}</h1>
            </div>
            <h2>Task: {task}</h2>
            <Editor
                height="70vh"
                language="javascript"
                value={code}
                onChange={handleCodeChange}
            />
            <button onClick={() => sendMessage({ type: 'submitCode', payload: { sessionId, learnerId, code, task } })}>Submit for Evaluation</button>
            {evaluation && (
                <div>
                    <h3>Evaluation</h3>
                    <p>Score: {evaluation.score}</p>
                    <p>Feedback: {evaluation.feedback}</p>
                </div>
            )}
        </div>
    );
};

export default LearnerPage;