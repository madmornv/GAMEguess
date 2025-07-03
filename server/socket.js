// server/socket.js (puedes modularizar)
io.on('connection', (socket) => {
    socket.on('dibujo', (data) => {
        socket.broadcast.emit('recibir_dibujo', data);
    });

    socket.on('mensaje_chat', (msg) => {
        io.emit('mensaje_chat', msg);
        // Si msg === palabraCorrecta → emitir ganador
    });

    socket.on('nueva_ronda', () => {
        // Elegir dibujante, palabra y notificar
    });
});
