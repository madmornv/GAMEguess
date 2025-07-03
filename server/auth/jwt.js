const jwt = require('jsonwebtoken');
require('dotenv').config();

function verificarTokenSocket(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Token no proporcionado'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.usuario = decoded;
    next();
  } catch (err) {
    return next(new Error('Token inválido'));
  }
}

module.exports = { verificarTokenSocket };

