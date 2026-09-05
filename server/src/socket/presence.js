const projectUsers = new Map();

const getOnlineUsers = (projectId) => {

    const users = projectUsers.get(projectId);

    if (!users) {
        return [];
    }

    const uniqueUsers = new Map();

    for (const [socketId, userId] of users.entries()) {

        if (!uniqueUsers.has(userId)) {
            uniqueUsers.set(userId, {
                userId
            });
        }
    }

    return Array.from(uniqueUsers.values());
};

module.exports = {
    projectUsers,
    getOnlineUsers
};