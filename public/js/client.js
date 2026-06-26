// Conexión a Socket.IO
const socket = io();

// Elementos del DOM
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messagesDisplay = document.getElementById('chat-messages');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const filePreviewName = document.getElementById('file-preview-name');
const filePreviewSize = document.getElementById('file-preview-size');
const cancelFileBtn = document.getElementById('cancel-file-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiContainer = document.getElementById('emoji-picker-container');
const textInput = document.getElementById('msg-text');
const currentRoomTitle = document.getElementById('current-room-title');
const currentRoomDesc = document.getElementById('current-room-desc');
const roomsListContainer = document.getElementById('rooms-list-container');
const userProfileName = document.getElementById('user-profile-name');
const userProfileAvatar = document.getElementById('user-profile-avatar');
const muteBtn = document.getElementById('mute-btn');
const muteIcon = document.getElementById('mute-icon');
const logoutBtn = document.getElementById('logout-btn');

// Lightbox Modal
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const closeLightboxBtn = document.getElementById('close-lightbox-btn');

// Estado de la Aplicación
let currentUser = '';
let currentRoom = 'Taberna del Dragón (General)';
let selectedFile = null;
let renderedMessagesCount = 0;
const PAGE_SIZE = 20;

// Configuración de Sonidos (Req 7)
let isMuted = localStorage.getItem('chat_muted') === 'true';

// Sintetizador de Web Audio API para asegurar que los sonidos funcionen sin depender de URLs externas/CORS
function playNotificationSound(type) {
    if (isMuted) return;
    
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        const now = ctx.currentTime;
        
        if (type === 'message') {
            // Sonido de mensaje: pop rápido y agradable
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now); // A4
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5 (subida rápida)
            
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'system') {
            // Sonido de sistema: campana doble
            // Nota 1
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            gain1.gain.setValueAtTime(0.08, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.15);
            
            // Nota 2 (un poco retrasada)
            const delay = 0.08;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(880.00, now + delay); // A5
            gain2.gain.setValueAtTime(0.08, now + delay);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + delay);
            osc2.stop(now + delay + 0.25);
        }
    } catch (error) {
        console.error("Error al reproducir sonido sintetizado:", error);
    }
}

// Descripciones de Salas
const roomDescriptions = {
    'Taberna del Dragón (General)': 'Canal de conversación general y de bienvenida.',
    'Sala de Rol D&D': '⚔️ Taberna de aventureros para planificar campañas de rol.',
    'Mesa de Estrategia': '🧠 Discusiones tácticas, juegos de mesa y ajedrez.',
    'Creación de Personajes': '🎨 Diseña tus fichas, avatares y hojas de personaje.'
};

// Inicializar estado de Silencio al cargar
updateMuteUI();

/* GESTIÓN DE AUTENTICACIÓN Y LOGIN */
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const usernameVal = document.getElementById('username').value.trim();
    const roomVal = document.getElementById('room-select').value;

    if (usernameVal) {
        currentUser = usernameVal;
        currentRoom = roomVal;

        // Actualizar UI del perfil
        userProfileName.innerText = currentUser;
        userProfileAvatar.innerText = currentUser.charAt(0).toUpperCase();

        // Unirse a la sala vía Socket
        socket.emit('joinRoom', { username: currentUser, room: currentRoom });

        // Cambiar pantallas
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');

        // Actualizar estado de sala activa en sidebar
        updateSidebarActiveRoom();

        // Cargar Historial
        loadRoomHistory(currentRoom);
    }
});

/* CAMBIO DE SALAS (Requerimiento 4) */
roomsListContainer.addEventListener('click', (e) => {
    const roomItem = e.target.closest('.room-item');
    if (!roomItem) return;

    const newRoom = roomItem.getAttribute('data-room');
    if (newRoom === currentRoom) return;

    // Cambiar sala activa
    currentRoom = newRoom;
    updateSidebarActiveRoom();

    // Notificar al servidor el cambio
    socket.emit('joinRoom', { username: currentUser, room: currentRoom });

    // Resetear buscador e inputs
    resetSearch();
    clearFileInput();

    // Cargar historial de la nueva sala
    loadRoomHistory(currentRoom);
});

// Resalta la sala activa en el sidebar y actualiza el encabezado
function updateSidebarActiveRoom() {
    // Actualizar sidebar clases
    document.querySelectorAll('.room-item').forEach(item => {
        if (item.getAttribute('data-room') === currentRoom) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Actualizar títulos
    currentRoomTitle.innerText = `Sala: ${currentRoom}`;
    currentRoomDesc.innerText = roomDescriptions[currentRoom] || 'Sala temática de conversación.';
}

/* HISTORIAL Y PERSISTENCIA CLIENTE (Requerimiento 8) */

// Guarda un mensaje en el localStorage de la sala
function saveMessageToLocalHistory(room, msgObj) {
    const historyKey = `chat_history_${room}`;
    let history = JSON.parse(localStorage.getItem(historyKey)) || [];
    history.push(msgObj);
    localStorage.setItem(historyKey, JSON.stringify(history));
}

// Carga e inicializa el historial de una sala
function loadRoomHistory(room) {
    messagesDisplay.innerHTML = '';
    const historyKey = `chat_history_${room}`;
    let history = JSON.parse(localStorage.getItem(historyKey)) || [];

    // Si el historial está completamente vacío, generamos unos mensajes iniciales simulando historial previo
    if (history.length === 0) {
        history = generateInitialMockHistory(room);
        localStorage.setItem(historyKey, JSON.stringify(history));
    }

    // Paginación inicial: Renderizar las últimas PAGE_SIZE (20) burbujas
    const startIdx = Math.max(0, history.length - PAGE_SIZE);
    const initialBatch = history.slice(startIdx);
    renderedMessagesCount = initialBatch.length;

    initialBatch.forEach(msg => {
        renderMessageBubble(msg, false); // agregar al final
    });

    scrollToBottom();
}

// Genera un historial ficticio inicial para demostrar la funcionalidad de Scroll Infinito
function generateInitialMockHistory(room) {
    const mocks = [];
    const timestampStart = Date.now() - 24 * 60 * 60 * 1000; // Hace 24 horas
    for (let i = 1; i <= 35; i++) {
        mocks.push({
            username: 'Historial',
            text: `Mensaje de archivo previo #${i} registrado en la sala temática: ${room}.`,
            timestamp: timestampStart + i * 15 * 60 * 1000,
            isSystem: false
        });
    }
    mocks.push({
        username: 'Sistema',
        text: `--- Fin del historial de archivo. Conversación en vivo iniciada ---`,
        timestamp: Date.now(),
        isSystem: true
    });
    return mocks;
}

/*SCROLL INFINITO (Requerimiento 9) */
messagesDisplay.addEventListener('scroll', () => {
    if (messagesDisplay.scrollTop === 0) {
        // Cargar mensajes más antiguos del historial local
        loadOlderMessages();
    }
});

function loadOlderMessages() {
    const historyKey = `chat_history_${currentRoom}`;
    const history = JSON.parse(localStorage.getItem(historyKey)) || [];

    // Si ya renderizamos todo el historial disponible
    if (renderedMessagesCount >= history.length) {
        // Si no se ha agregado ya el indicador de inicio del historial
        if (!document.getElementById('history-start-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'history-start-indicator';
            indicator.classList.add('system-notification');
            indicator.innerText = '✨ Inicio del historial de la sala';
            messagesDisplay.insertBefore(indicator, messagesDisplay.firstChild);
        }
        return;
    }

    const previousScrollHeight = messagesDisplay.scrollHeight;

    // Calcular límites de la página anterior
    const total = history.length;
    const end = total - renderedMessagesCount;
    const start = Math.max(0, end - PAGE_SIZE);
    const olderBatch = history.slice(start, end);

    // Prependear mensajes más antiguos en orden inverso al principio del chat
    // Para que aparezcan ordenados de más antiguo a más nuevo
    for (let i = olderBatch.length - 1; i >= 0; i--) {
        renderMessageBubble(olderBatch[i], true); // true = prependear al inicio
    }

    renderedMessagesCount += olderBatch.length;

    // Ajustar scroll para mantener la posición visual (evita saltos bruscos)
    const newScrollHeight = messagesDisplay.scrollHeight;
    messagesDisplay.scrollTop = newScrollHeight - previousScrollHeight;
}

/* BÚSQUEDA EN EL HISTORIAL (Requerimiento 8) */
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();

    if (term.length > 0) {
        clearSearchBtn.classList.remove('hidden');
        performSearch(term);
    } else {
        clearSearchBtn.classList.add('hidden');
        loadRoomHistory(currentRoom);
    }
});

clearSearchBtn.addEventListener('click', () => {
    resetSearch();
    loadRoomHistory(currentRoom);
});

function resetSearch() {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
}

function performSearch(term) {
    messagesDisplay.innerHTML = '';
    const historyKey = `chat_history_${currentRoom}`;
    const history = JSON.parse(localStorage.getItem(historyKey)) || [];

    // Filtrar coincidencias
    const results = history.filter(msg => {
        if (msg.isSystem) return false;
        return (msg.username && msg.username.toLowerCase().includes(term)) ||
            (msg.text && msg.text.toLowerCase().includes(term));
    });

    if (results.length === 0) {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.classList.add('system-notification');
        noResultsDiv.innerText = `No se encontraron coincidencias para "${term}"`;
        messagesDisplay.appendChild(noResultsDiv);
        return;
    }

    // Renderizar resultados con el término resaltado
    results.forEach(msg => {
        renderMessageBubble(msg, false, term);
    });
}

// Resalta texto de forma segura
function highlightText(text, term) {
    if (!term) return text;
    // Escapar caracteres regex especiales en el término
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/* ENVÍO DE MENSAJES Y ARCHIVOS (Requerimiento 6) */

// Captura de archivos adjuntos
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    selectedFile = file;
    filePreviewName.innerText = file.name;

    // Formatear tamaño
    const sizeKB = Math.round(file.size / 1024);
    filePreviewSize.innerText = sizeKB > 1024
        ? `(${(sizeKB / 1024).toFixed(1)} MB)`
        : `(${sizeKB} KB)`;

    filePreviewContainer.classList.remove('hidden');
    textInput.focus();
});

// Cancelar archivo seleccionado
cancelFileBtn.addEventListener('click', () => {
    clearFileInput();
});

function clearFileInput() {
    fileInput.value = '';
    selectedFile = null;
    filePreviewContainer.classList.add('hidden');
}

// Envío del Formulario
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = textInput.value.trim();

    if (!text && !selectedFile) return;

    if (selectedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => {
            const msgObj = {
                username: currentUser,
                text: text || `Compartió un archivo: ${selectedFile.name}`,
                file: reader.result,
                fileName: selectedFile.name,
                fileType: selectedFile.type,
                timestamp: Date.now()
            };
            socket.emit('chatMessage', msgObj);
            clearFileInput();
        };
    } else {
        const msgObj = {
            username: currentUser,
            text: text,
            timestamp: Date.now()
        };
        socket.emit('chatMessage', msgObj);
    }

    textInput.value = '';
    textInput.focus();
});

/* INTEGRACIÓN EMOJI MART (Requerimiento 6) */
let picker;
try {
    if (typeof EmojiMart !== 'undefined') {
        const pickerOptions = {
            locale: 'es',
            theme: 'dark',
            set: 'native',
            onEmojiSelect: (emoji) => {
                textInput.value += emoji.native;
                textInput.focus();
                emojiContainer.classList.add('hidden');
            }
        };
        picker = new EmojiMart.Picker(pickerOptions);
        emojiContainer.appendChild(picker);
    }
} catch (e) {
    console.error("Error al cargar Emoji Mart:", e);
}

// Abrir / Cerrar selector emojis
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiContainer.classList.toggle('hidden');
});

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    if (emojiContainer && !emojiContainer.contains(e.target) && e.target !== emojiBtn) {
        emojiContainer.classList.add('hidden');
    }
});

/* RECIPIENTES DE SOCKETS (Requerimiento 2, 3 y 7) */

// Mensajes entrantes del servidor
socket.on('message', (msgData) => {
    const isHistorical = false;

    // Guardar en almacenamiento persistente
    saveMessageToLocalHistory(currentRoom, msgData);

    // Renderizar
    renderMessageBubble(msgData, false);
    renderedMessagesCount++;

    scrollToBottom();

    // Reproducir alerta sonora de nuevo mensaje (si no es propio)
    if (msgData.username !== currentUser) {
        playNotificationSound('message');
    }
});

// Notificaciones del sistema (ej: unirse/abandonar)
socket.on('notification', (data) => {
    const msgData = {
        username: 'Sistema',
        text: data.text,
        timestamp: Date.now(),
        isSystem: true
    };

    // Guardar en el historial para persistir la notificación
    saveMessageToLocalHistory(currentRoom, msgData);

    // Renderizar
    renderMessageBubble(msgData, false);
    renderedMessagesCount++;
    scrollToBottom();

    // Reproducir alerta sonora de notificación
    playNotificationSound('system');
});

/*  RENDERIZADOR DE BURBUJAS DE CHAT */
function renderMessageBubble(msgData, prepend = false, searchTerm = null) {
    const div = document.createElement('div');

    // Mensaje de sistema
    if (msgData.isSystem || msgData.username === 'Sistema') {
        div.classList.add('system-notification');
        div.innerText = msgData.text;
    } else {
        // Burbuja de mensaje estándar
        div.classList.add('message-bubble');
        const isMine = msgData.username === currentUser;
        div.classList.add(isMine ? 'my-message' : 'other-message');

        // Estructura interna
        let cleanText = highlightText(escapeHTML(msgData.text), searchTerm);
        let content = `<strong>${escapeHTML(msgData.username)}</strong>`;
        content += `<p>${cleanText}</p>`;

        // Si contiene un archivo adjunto
        if (msgData.file) {
            const isImage = msgData.fileType && msgData.fileType.startsWith('image/');
            if (isImage) {
                // Previsualización de imagen inline
                content += `<img src="${msgData.file}" class="chat-image" alt="${escapeHTML(msgData.fileName)}" data-filename="${escapeHTML(msgData.fileName)}">`;
            } else {
                // Caja de descarga estándar
                content += `
                <a href="${msgData.file}" download="${escapeHTML(msgData.fileName)}" class="file-download-card">
                    <span class="file-download-icon">📎</span>
                    <div class="file-download-details">
                        <span class="file-download-name">${escapeHTML(msgData.fileName)}</span>
                        <span class="file-download-action">Haga clic para descargar</span>
                    </div>
                </a>`;
            }
        }

        div.innerHTML = content;

        // Añadir manejadores a las imágenes
        const imgEl = div.querySelector('.chat-image');
        if (imgEl) {
            imgEl.addEventListener('click', () => {
                openLightbox(msgData.file, msgData.fileName);
            });
        }
    }

    if (prepend) {
        messagesDisplay.insertBefore(div, messagesDisplay.firstChild);
    } else {
        messagesDisplay.appendChild(div);
    }
}

// Helpers útiles
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function scrollToBottom() {
    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
}

/* MODAL LIGHTBOX PARA IMÁGENES */
function openLightbox(src, filename) {
    lightboxImg.src = src;
    lightboxCaption.innerText = filename || 'Imagen adjunta';
    lightboxModal.classList.remove('hidden');
    lightboxModal.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
    lightboxModal.classList.add('hidden');
    lightboxModal.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
    lightboxCaption.innerText = '';
}

closeLightboxBtn.addEventListener('click', closeLightbox);
lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) {
        closeLightbox();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightboxModal.classList.contains('hidden')) {
        closeLightbox();
    }
});

/* CONTROLES DE SONIDO (MUTE) (Requerimiento 7) */
muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem('chat_muted', isMuted);
    updateMuteUI();
});

function updateMuteUI() {
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteIcon.innerText = '🔇';
        muteBtn.title = 'Activar notificaciones sonoras';
    } else {
        muteBtn.classList.remove('muted');
        muteIcon.innerText = '🔊';
        muteBtn.title = 'Silenciar notificaciones sonoras';
    }
}

/* LOGOUT / SALIDA DE LA APP */
logoutBtn.addEventListener('click', () => {
    const confirmar = confirm('¿Estás seguro de que deseas salir del chat? Tus historiales locales permanecerán guardados.');

    if (confirmar) {
        // Desconexión
        socket.disconnect();

        // Limpiar interfaz
        messagesDisplay.innerHTML = '';
        resetSearch();
        clearFileInput();
        currentUser = '';

        // Transición de paneles
        chatContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');

        // Reconectar socket para el próximo logueo
        socket.connect();
    }
});