import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);

   const shouldReconnect = useRef(true);

   const reconnect = useCallback(() => {
       if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
           return;
       }

       const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001/ws';
       ws.current = new WebSocket(wsUrl);

       ws.current.onopen = () => {
           console.log('WebSocket connected');
           setIsConnected(true);
       };

       ws.current.onmessage = (event) => {
           const message = JSON.parse(event.data);
           setMessages(prevMessages => [...prevMessages, message]);
       };

       ws.current.onclose = () => {
           console.log('WebSocket disconnected');
           setIsConnected(false);
           if (shouldReconnect.current) {
               setTimeout(reconnect, 5000); // Reconnect after 5 seconds
           }
       };

       ws.current.onerror = (event) => {
           console.error('WebSocket error observed:', event);
       };
   }, []);

   useEffect(() => {
       shouldReconnect.current = true;
       reconnect();

       return () => {
           shouldReconnect.current = false;
           if (ws.current) {
               ws.current.close();
           }
       };
   }, [reconnect]);

    const sendMessage = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        }
    }, []);

    const contextValue = useMemo(() => ({
        messages,
        sendMessage,
        isConnected,
    }), [messages, sendMessage, isConnected]);

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};