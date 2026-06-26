# PW Chat - Chat en Tiempo Real con Funcionalidades Avanzadas

Aplicación de chat en tiempo real diseñada para el desarrollo de comunicación interactiva en web, incorporando una experiencia de usuario fluida, diseño oscuro moderno y almacenamiento local.

## 🚀 Características Principales

1. **Comunicación en Tiempo Real:** Implementada con Socket.IO para el envío instantáneo de mensajes y notificaciones de sistema.
2. **Navegación entre Salas:** Panel lateral interactivo para cambiar de canal (Taberna, Pathfinder, Estrategia, Personajes) con aislamiento de sockets por sala.
3. **Persistencia del Historial:** Guardado local independiente por canal en `localStorage`, resolviendo la pérdida de datos al cambiar de pestaña o sala.
4. **Scroll Infinito Paginado:** Carga progresiva y fluida de bloques de 20 mensajes anteriores al desplazarse al tope de la pantalla de chat.
5. **Búsqueda Avanzada:** Filtrado de mensajes en tiempo real dentro de la sala activa, con resaltado visual del término buscado.
6. **Emojis y Archivos Adjuntos:**
   * Selector de emojis integrado (Emoji Mart).
   * Previsualizador antes de enviar.
   * Visualización directa de imágenes con efecto Lightbox al hacer clic.
   * Tarjetas de descarga para otros tipos de archivos (.pdf, .txt, etc.).
7. **Notificaciones de Audio Nativas:** Alertas de sonido sintetizadas en tiempo real con **Web Audio API** (evitando bloqueos de CORS o red), con botón para silenciar (Mute).

## 🛠️ Tecnologías Utilizadas

* **Servidor (Backend):** Node.js, Express, Socket.IO
* **Cliente (Frontend):** HTML5 Semántico, CSS3 (Glassmorphism & Variables CSS), JavaScript Vanilla (ES6)

## 🏃 Instrucciones de Ejecución

1. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Iniciar el servidor:
   ```bash
   node server.js
   ```

3. Abrir la aplicación en el navegador:
   * Accede a: [http://localhost:3000](http://localhost:3000)
