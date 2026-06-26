const socket = io();

// Elementos del DOM
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messagesDisplay = document.getElementById('chat-messages');
const searchInput = document.getElementById('search-input');
const fileInput = document.getElementById('file-input');
const emojiBtn = document.getElementById('emoji-btn');
const emojiContainer = document.getElementById('emoji-picker-container');
const textInput = document.getElementById('msg-text');

let currentUser = '';
let currentRoom = '';
let messageHistory = []; // Almacenamiento local para búsquedas (Req 8)

// Configuración de notificaciones de audio (Req 7)
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav');

// Manejo del Login y selección de salas (Req 4 y 5)
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser = document.getElementById('username').value.trim();
    currentRoom = document.getElementById('room-select').value;

    if (currentUser) {
        socket.emit('joinRoom', { username: currentUser, room: currentRoom });
        
        document.getElementById('current-room-title').innerText = `Sala: ${currentRoom}`;
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        loadMockHistoricalMessages(); // Carga inicial para scroll infinito
    }
});

// Envío de Mensajes y Archivos (Req 6)
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const textInput = document.getElementById('msg-text');
    const text = textInput.value.trim();
    const file = fileInput.files[0];

    if (!text && !file) return;

    if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            socket.emit('chatMessage', {
                username: currentUser,
                text: text || `Compartió un archivo: ${file.name}`,
                file: reader.result,
                fileName: file.name
            });
            fileInput.value = ''; // Limpiar input de archivo
        };
    } else {
        socket.emit('chatMessage', { username: currentUser, text: text });
    }
    textInput.value = '';
});

// Inicializar el selector de Emoji Mart (Requerimiento 6)
const pickerOptions = { 
    locale: 'es',
    onEmojiSelect: (emoji) => {
        textInput.value += emoji.native;
        textInput.focus();
        emojiContainer.classList.add('hidden');
    } 
};
const picker = new EmojiMart.Picker(pickerOptions);
emojiContainer.appendChild(picker);

// Mostrar / Ocultar la ventana de emojis al hacer clic en el botón
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita que el evento cierre la ventana inmediatamente
    emojiContainer.classList.toggle('hidden');
});

// Cerrar la ventana de emojis si el usuario hace clic en cualquier otra parte del chat
document.addEventListener('click', (e) => {
    if (!emojiContainer.contains(e.target) && e.target !== emojiBtn) {
        emojiContainer.classList.add('hidden');
    }
});

// Recibir mensajes del servidor (Req 2, 3 y 6)
socket.on('message', (msgData) => {
    messageHistory.push(msgData); // Guardar en historial para el cliente
    renderMessage(msgData);
    
    // Si el mensaje es de otro usuario, reproducir alerta (Req 7)
    if (msgData.username !== currentUser) {
        notificationSound.play().catch(e => console.log("Interacción de usuario requerida para reproducir audio."));
    }
});

// Recibir notificaciones del sistema (Entradas / Salidas) (Req 7)
socket.on('notification', (data) => {
    const div = document.createElement('div');
    div.classList.add('system-notification');
    div.innerText = data.text;
    messagesDisplay.appendChild(div);
    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
});

// Renderizar un mensaje en la caja de chat
function renderMessage(msgData) {
    const div = document.createElement('div');
    div.classList.add('message-bubble');
    div.classList.add(msgData.username === currentUser ? 'my-message' : 'other-message');
    
    let content = `<strong>${msgData.username}:</strong> <p>${msgData.text}</p>`;
    
    if (msgData.file) {
        content += `<br><a href="${msgData.file}" download="${msgData.fileName}" class="file-download">💾 Descargar ${msgData.fileName}</a>`;
    }
    
    div.innerHTML = content;
    messagesDisplay.appendChild(div);
    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
}

// Requerimiento 8: Sistema de Búsqueda Local en tiempo real
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    messagesDisplay.innerHTML = ''; // Limpiar pantalla
    
    const filtered = messageHistory.filter(msg => 
        msg.text.toLowerCase().includes(term) || msg.username.toLowerCase().includes(term)
    );
    
    filtered.forEach(msg => renderMessage(msg));
});

// Requerimiento 9: Scroll Infinito (Carga de mensajes anteriores al subir al tope)
messagesDisplay.addEventListener('scroll', () => {
    if (messagesDisplay.scrollTop === 0) {
        // El usuario llegó arriba: Simular la carga de 5 mensajes más antiguos
        for(let i = 0; i < 3; i++) {
            const historicalMsg = { username: 'Sistema', text: '--- Mensaje antiguo recuperado del historial ---' };
            messageHistory.unshift(historicalMsg); // Añadir al inicio del historial
            
            const div = document.createElement('div');
            div.classList.add('message-bubble', 'system-notification');
            div.innerText = historicalMsg.text;
            messagesDisplay.insertBefore(div, messagesDisplay.firstChild);
        }
        messagesDisplay.scrollTop = 30; // Desplazar levemente para no romper el bucle
    }
});

function loadMockHistoricalMessages() {
    // Inicializador para poder realizar scroll infinito
    for(let i = 0; i < 15; i++) {
        messageHistory.push({ username: 'Historial', text: `Mensaje previo archivado número ${i+1}` });
    }
    messageHistory.forEach(msg => renderMessage(msg));
}