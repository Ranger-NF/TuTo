import React from 'react';

const Leaderboard = ({ leaderboard }) => {
    return (
        <div>
            <h3>Leaderboard</h3>
            <ol>
                {leaderboard.sort((a, b) => b.score - a.score || a.speed - b.speed).map((entry, index) => (
                    <li key={index}>
                        {entry.name} - Score: {entry.score}, Time: {entry.speed}s
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default Leaderboard;