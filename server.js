const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Servir la carpeta frontend estática
app.use(express.static(path.join(__dirname, 'public')));

// Gestión de conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado:', socket.id);

    // Requerimiento 4 & 5: Autenticación básica y unirse a salas temáticas
    socket.on('joinRoom', ({ username, room }) => {
        // Si el usuario ya estaba en una sala, salir de ella primero
        if (socket.room && socket.room !== room) {
            socket.leave(socket.room);
            // Notificar a la sala anterior
            socket.to(socket.room).emit('notification', {
                text: `${socket.username || username} ha salido de la sala.`
            });
            console.log(`Usuario ${username} cambió de sala: ${socket.room} -> ${room}`);
        }

        socket.join(room);
        
        // Requerimiento 7: Notificación cuando alguien se une
        socket.to(room).emit('notification', {
            text: `${username} se ha unido a la sala.`
        });

        // Guardar metadata en el socket de la sesión actual
        socket.username = username;
        socket.room = room;
    });

    // Requerimiento 6: Recepción y retransmisión de mensajes/archivos
    socket.on('chatMessage', (msgData) => {
        // msgData contendrá: { username, text, file, fileType, fileName }
        io.to(socket.room).emit('message', msgData);
    });

    // Requerimiento 7: Notificación cuando alguien abandona
    socket.on('disconnect', () => {
        if (socket.username && socket.room) {
            io.to(socket.room).emit('notification', {
                text: `${socket.username} ha salido de la sala.`
            });
        }
        console.log('Usuario desconectado:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en http://localhost:${PORT}`);
});