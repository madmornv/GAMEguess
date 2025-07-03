const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const usuarios = [
  { username: 'Isa', password: '1234' },
  { username: 'Lucho', password: 'kimberly' },
  { username: 'Nari', password: 'lateti' },
  { username: 'juayo', password: 'cristian' }
];


router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (usuarios.find(u => u.username === username)) {
    return res.status(400).json({ msg: 'Usuario ya existe' });
  }

  usuarios.push({ username, password });
  res.json({ msg: 'Registrado con éxito' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = usuarios.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ msg: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});

module.exports = router;


