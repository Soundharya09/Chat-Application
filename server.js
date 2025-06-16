const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const moment = require('moment');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = {};
const messageQueue = [];

// Function to generate avatar URL using ui-avatars.com
const generateAvatarUrl = (username) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=100&background=random&color=fff`;
};

// Initialize simulated users with ui-avatars.com URLs
const initUsers = [
    { username: 'Alice', avatar: generateAvatarUrl('Alice') },
    { username: 'Bob', avatar: generateAvatarUrl('Bob') },
    { username: 'Charlie', avatar: generateAvatarUrl('Charlie') }
];
initUsers.forEach((user, index) => {
    users[`simulated-${index}`] = user;
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Helper function to convert users object to array
const getUsersArray = () => {
    return Object.values(users);
};

io.on('connection', (socket) => {
    // Send initial user list and message history to new connections
    io.to(socket.id).emit('userList', getUsersArray());
    io.to(socket.id).emit('messageHistory', messageQueue);

    socket.on('join', (username) => {
        const avatar = generateAvatarUrl(username); // Generate avatar URL for new user
        users[socket.id] = { username, avatar };
        const joinMessage = {
            username,
            content: `${username} joined the chat!`,
            timestamp: moment().format('HH:mm:ss'),
            avatar
        };
        messageQueue.push(joinMessage);
        io.emit('message', joinMessage);
        io.emit('userList', getUsersArray());
    });

    socket.on('message', (content) => {
        const user = users[socket.id];
        if (user && content) {
            const message = {
                username: user.username,
                content,
                timestamp: moment().format('HH:mm:ss'),
                avatar: user.avatar
            };
            messageQueue.push(message);
            io.emit('message', message);
        }
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            const leaveMessage = {
                username: user.username,
                content: `${user.username} left the chat!`,
                timestamp: moment().format('HH:mm:ss'),
                avatar: user.avatar
            };
            messageQueue.push(leaveMessage);
            io.emit('message', leaveMessage);
            delete users[socket.id];
            io.emit('userList', getUsersArray());
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});