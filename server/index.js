const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const { verificarTokenSocket } = require('./auth/jwt');
const authRoutes = require('./routes/auth');
const { usuarios } = require('./models/user');

const app = express();
app.use(cors());
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, 'client')));

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

// Ronda y palabra
let palabraSecreta = '';
let dibujanteActual = '';
let adivinanzasPendientes = [];

const palabras = ['gato', 'casa', 'sol', 'computador', 'robot', 'pizza'];

io.use(verificarTokenSocket);

io.on('connection', (socket) => {
  const user = socket.usuario.username;
  usuarios.push(user);

  // Elegir dibujante si es el primero
  if (!dibujanteActual) {
    dibujanteActual = user;
    palabraSecreta = palabras[Math.floor(Math.random() * palabras.length)];
  }

  // Emitir bienvenida al nuevo
  socket.emit('bienvenida', {
    user,
    dibujante: dibujanteActual,
    palabra: palabraSecreta
  });

  // Emitir a todos los usuarios conectados
  io.emit('usuarios_conectados', usuarios);

  // Dibujo en canvas
  socket.on('dibujo', (data) => {
    socket.broadcast.emit('recibir_dibujo', data);
  });

  // Mensajes de chat
  socket.on('mensaje_chat', (mensaje) => {
    io.emit('mensaje_chat', { usuario: user, mensaje });
  });

  // Adivinanzas recibidas
  socket.on('adivinar', (mensaje) => {
    if (user !== dibujanteActual) {
      const datos = { usuario: user, mensaje };
      adivinanzasPendientes.push(datos);
      const sockets = Array.from(io.sockets.sockets.values());
      const dibujanteSocket = sockets.find(s => s.usuario?.username === dibujanteActual);
      if (dibujanteSocket) {
        dibujanteSocket.emit('nueva_adivinanza', datos);
      }
    }
  });

  // Cuando el dibujante acepta al ganador
  socket.on('ganador', (ganador) => {
    io.emit('fin_ronda', ganador);
    // Reiniciar juego
    dibujanteActual = '';
    palabraSecreta = '';
    adivinanzasPendientes = [];
    usuarios.length = 0;
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    const index = usuarios.indexOf(user);
    if (index !== -1) usuarios.splice(index, 1);
    io.emit('usuarios_conectados', usuarios);
  });
});

server.listen(3000, () => {
  console.log('🎮 Servidor corriendo en http://localhost:3000');
});
