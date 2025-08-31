import React from 'react';

const Leaderboard = ({ learners, leaderboard }) => {
    const leaderboardData = learners.map(learner => {
        const scoreData = leaderboard.find(entry => entry.name === learner.name);
        return {
            name: learner.name,
            score: scoreData ? scoreData.score : 'N/A',
            speed: scoreData ? scoreData.speed : 'N/A'
        };
    });

    return (
        <div>
            <h3>Leaderboard</h3>
            <ol>
                {leaderboardData.map((entry, index) => (
                    <li key={index}>
                        {entry.name} - Score: {entry.score}
                        {entry.speed !== 'N/A' && `, Time: ${entry.speed}s`}
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default Leaderboard;