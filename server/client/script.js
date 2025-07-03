// Conexión dinámica para producción y local
const socket = io({
  auth: {
    token: localStorage.getItem('token')
  }
});

let modo = 'pincel';
let color = '#ffffff';
let size = 4;
let esDibujante = false;
let username = '';
let palabraActual = '';
let estaDibujando = false;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const chat = document.getElementById('chat');
const messageInput = document.getElementById('messageInput');
const userList = document.getElementById('userList');
const dibujanteActual = document.getElementById('dibujanteActual');
const tools = document.getElementById('tools');
const adivinanzasDiv = document.getElementById('adivinanzas');

let lastX, lastY;

// Eventos del mouse para dibujar
canvas.addEventListener('mousedown', (e) => {
  if (!esDibujante) return;
  estaDibujando = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener('mouseup', () => estaDibujando = false);

canvas.addEventListener('mousemove', (e) => {
  if (!estaDibujando || !esDibujante) return;

  const x = e.offsetX;
  const y = e.offsetY;

  if (modo === 'pincel') {
  ctx.globalCompositeOperation = 'source-over'; // pintar normal
  ctx.strokeStyle = color;
} else {
  ctx.globalCompositeOperation = 'destination-out'; // borrar
  ctx.strokeStyle = 'rgba(0,0,0,1)'; // este color no importa, se usa para borrar
}

  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';


  socket.emit('dibujo', {
  x0: lastX,
  y0: lastY,
  x1: x,
  y1: y,
  color: modo === 'pincel' ? color : 'erase',
  size
});


  [lastX, lastY] = [x, y];
});

// Recibir dibujo
socket.on('recibir_dibujo', ({ x0, y0, x1, y1, color, size }) => {
  if (color === 'erase') {
    ctx.globalCompositeOperation = 'destination-out'; // borrar
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over'; // pintar
    ctx.strokeStyle = color;
  }

  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.globalCompositeOperation = 'source-over'; // restaurar
});



// Conectado al servidor
socket.on('connect', () => {
  console.log('Conectado al servidor con JWT');
});

// Recibir info del usuario conectado
socket.on('bienvenida', ({ user, dibujante, palabra }) => {
  username = user;
  esDibujante = (user === dibujante);
  dibujanteActual.textContent = `🧑‍🎨 Dibujante: ${dibujante}`;
  palabraActual = palabra;

  if (esDibujante) {
    tools.style.display = 'block';
    adivinanzasDiv.style.display = 'block';
  } else {
    tools.style.display = 'none';
    adivinanzasDiv.style.display = 'none';
  }
});

// Lista de usuarios conectados
socket.on('usuarios_conectados', (usuarios) => {
  userList.innerHTML = '<strong>Jugadores conectados:</strong>';
  usuarios.forEach(u => {
    const div = document.createElement('div');
    div.classList.add('user');
    div.textContent = u;
    userList.appendChild(div);
  });
});

// Recibir mensaje de chat
socket.on('mensaje_chat', ({ usuario, mensaje }) => {
  const msg = document.createElement('div');
  msg.classList.add('chat-message');
  msg.innerHTML = `<strong>${usuario}:</strong> ${mensaje}`;
  chat.appendChild(msg);

  // Si no eres el dibujante, lo mandaste tú
  if (!esDibujante && usuario === username) {
    socket.emit('adivinar', mensaje);
  }
});

// Adivinanzas (solo para el dibujante)
socket.on('nueva_adivinanza', ({ usuario, mensaje }) => {
  if (!esDibujante) return;
  const div = document.createElement('div');
  div.innerHTML = `<strong>${usuario}:</strong> ${mensaje}
    <button onclick="aceptarGanador('${usuario}')">✅</button>
    <button onclick="rechazarAdivinanza(this)">❌</button>`;
  adivinanzasDiv.appendChild(div);
});

function rechazarAdivinanza(btn) {
  btn.parentElement.remove();
}

function aceptarGanador(ganador) {
  socket.emit('ganador', ganador);
}

// Mostrar ganador
socket.on('fin_ronda', (ganador) => {
  alert(`🎉 ${ganador} adivinó correctamente. ¡Fin de la ronda!`);
  location.reload();
});

function enviarMensaje() {
  const mensaje = messageInput.value;
  if (mensaje.trim() !== '') {
    socket.emit('mensaje_chat', mensaje);
    messageInput.value = '';
  }
}

// Eventos herramientas
document.getElementById('colorPicker').addEventListener('input', e => color = e.target.value);
document.getElementById('brushSize').addEventListener('input', e => size = e.target.value);


// Ajustar tamaño del canvas automáticamente
function ajustarCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

window.addEventListener('resize', ajustarCanvas);
window.addEventListener('load', ajustarCanvas);
