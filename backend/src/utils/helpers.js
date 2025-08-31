const crypto = require('crypto');

// Helper to generate unique IDs
const generateUniqueId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const getGravatarUrl = (email) => {
    const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
};

module.exports = {
    generateUniqueId,
    getGravatarUrl,
};