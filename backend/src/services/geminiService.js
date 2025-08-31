const { genAI, MENTOR_SECRET_KEY } = require('../config/env');
const { sessions } = require('../session/sessionManager');

async function handleEvaluateCode(payload) {
    const { sessionId, learnerId, secret, code, task } = payload;
    if (secret !== MENTOR_SECRET_KEY) {
        return;
    }
    const session = sessions.get(sessionId);
    if (session) {
        const learner = session.learners.get(learnerId);
        if (learner) {
            const codeToEvaluate = code;
            const taskToEvaluate = task || learner.task;

            const startTime = Date.now();
            console.log(`Evaluating code for learner ${learner.name}: ${codeToEvaluate}`);
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
                const prompt = `Evaluate the following ${session.currentTask.language} code snippet based on the task. Provide a score out of 10 and explain any errors.
                Code:
                ${codeToEvaluate}
                
                Task:
                ${taskToEvaluate || 'No specific task provided. Evaluate general code quality.'}
                
                Provide the response in a JSON format with 'score' (integer from 0 to 10) and 'feedback' (string, explaining errors and correctness).`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                let evaluationResult;
                try {
                    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');
                    evaluationResult = JSON.parse(cleanedText);
                } catch (parseError) {
                    console.error('Failed to parse Gemini response as JSON:', text, parseError);
                    evaluationResult = {
                        score: 0,
                        feedback: `Gemini response could not be parsed. Raw response: ${text}`
                    };
                }

                const endTime = Date.now();
                const speed = (endTime - startTime) / 1000; // in seconds

                const submission = session.currentTask.submissions.get(learnerId);
                const timeTaken = submission ? (submission.submittedAt - session.currentTask.startTime) / 1000 : session.currentTask.timeLimit;

                const roundScore = evaluationResult.score; // Score from Gemini is 0-10
                
                const finalScore = roundScore;

                const existingEntryIndex = session.leaderboard.findIndex(e => e.name === learner.name);

                if (existingEntryIndex > -1) {
                    session.leaderboard[existingEntryIndex].score += finalScore;
                    session.leaderboard[existingEntryIndex].speed += timeTaken;
                } else {
                    session.leaderboard.push({ name: learner.name, score: finalScore, speed: timeTaken });
                }

                if (learner.ws) {
                    learner.ws.send(JSON.stringify({ type: 'evaluationResult', payload: evaluationResult }));
                }
                if (session.mentorWs) {
                    session.mentorWs.send(JSON.stringify({ type: 'evaluationComplete', payload: { learnerId, result: evaluationResult } }));
                    session.mentorWs.send(JSON.stringify({ type: 'leaderboardUpdate', payload: { leaderboard: session.leaderboard } }));
                }
            } catch (geminiError) {
                console.error('Error calling Gemini API:', geminiError);
                const errorResult = {
                    score: 0,
                    feedback: `Error during evaluation: ${geminiError.message}`
                };
                if (learner.ws) {
                    learner.ws.send(JSON.stringify({ type: 'evaluationResult', payload: errorResult }));
                }
                if (session.mentorWs) {
                    session.mentorWs.send(JSON.stringify({ type: 'evaluationComplete', payload: { learnerId, result: errorResult } }));
                }
            }
        }
    }
}

module.exports = {
    handleEvaluateCode,
};