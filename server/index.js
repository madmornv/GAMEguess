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

// 🔐 Rutas primero, luego los estáticos
app.use('/api/auth', authRoutes);


// Ajuste: servir archivos desde la carpeta client DENTRO de server
const clientPath = path.join(__dirname, 'client');

// 🟢 Ruta inicial (login)
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'login.html'));
});

// 🎮 Ruta del juego
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// 📁 Archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static(clientPath));

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

  if (!dibujanteActual) {
    dibujanteActual = user;
    palabraSecreta = palabras[Math.floor(Math.random() * palabras.length)];
  }

  socket.emit('bienvenida', {
    user,
    dibujante: dibujanteActual,
    palabra: palabraSecreta
  });

  io.emit('usuarios_conectados', usuarios);

  socket.on('dibujo', (data) => {
    socket.broadcast.emit('recibir_dibujo', data);
  });

  socket.on('mensaje_chat', (mensaje) => {
    io.emit('mensaje_chat', { usuario: user, mensaje });
  });

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

  socket.on('ganador', (ganador) => {
    io.emit('fin_ronda', ganador);
    dibujanteActual = '';
    palabraSecreta = '';
    adivinanzasPendientes = [];
    usuarios.length = 0;
  });

  socket.on('disconnect', () => {
    const index = usuarios.indexOf(user);
    if (index !== -1) usuarios.splice(index, 1);
    io.emit('usuarios_conectados', usuarios);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Servidor corriendo en http://localhost:${PORT}`);
});
