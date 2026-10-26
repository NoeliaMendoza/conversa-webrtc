# Conversa Workspace

## Descripción

Aplicación web de mensajería grupal en tiempo real para el laboratorio de Aplicaciones Distribuidas. Los usuarios ingresan con un nombre y participan inicialmente en General. El sistema sincroniza mensajes, ediciones, eliminaciones, reacciones y presencia entre varios navegadores sin recargar la página. También ofrece conversaciones privadas con confirmación de recepción y lectura.

## Tecnologías utilizadas

- **Node.js:** ejecución del servidor.
- **Express:** entrega de HTML, CSS, JavaScript y recursos estáticos.
- **Socket.IO:** comunicación bidireccional por eventos, configurada con `transports: ['websocket']` en cliente y servidor.
- **HTML, CSS propio y JavaScript modular:** interfaz adaptable, sin framework visual.
- **Módulos nativos de Node.js:** HTTP, UUID, firma HMAC y pruebas con `node:test`.

Socket.IO utiliza su propio protocolo de eventos sobre WebSocket. No es la API nativa `WebSocket` ni la biblioteca `ws` directamente: ambos extremos usan Socket.IO. El transporte HTTP polling está desactivado. HTTP sirve los recursos iniciales y WebSocket transmite los eventos del chat.

## Requisitos

- Node.js **22 o superior**, con npm.
- Navegador moderno con JavaScript y WebSocket habilitados.
- Internet para descargar dependencias; para pruebas externas, conexión del computador y del cliente remoto.
- Puerto **3000** disponible, o configurar `PORT`.

La fuente Inter se carga desde Google Fonts; si no está disponible, se utiliza una fuente del sistema.

## Instalación

1. Descomprimir el proyecto.
2. Abrir una terminal dentro de la carpeta que contiene `package.json`.
3. Instalar las dependencias definidas en el archivo de bloqueo:

```sh
npm ci
```

En Windows PowerShell, si se bloquea `npm.ps1`, utilizar:

```powershell
npm.cmd ci
```

`npm install` también permite instalar las dependencias. La carpeta `node_modules` se genera localmente y se excluye de la entrega.

## Dependencias

| Paquete | Uso | Tipo |
| --- | --- | --- |
| `express` | Servidor de archivos estáticos | Ejecución |
| `socket.io` | Eventos y conexiones WebSocket | Ejecución |
| `socket.io-client` | Clientes de las pruebas automatizadas | Desarrollo |

Los rangos se declaran en `package.json` y las versiones resueltas están en `package-lock.json`. El cliente del navegador se carga desde `/socket.io/socket.io.js`, servido por la misma aplicación.

## Ejecución y puerto

```sh
npm start
```

Abrir **http://localhost:3000**. Mantener la terminal abierta. Para detener el servidor, pulsar **Ctrl + C**.

En PowerShell puede utilizarse `npm.cmd start`. Para reiniciar automáticamente al modificar el servidor:

```sh
npm run dev
```

Para ejecutar en otro puerto desde PowerShell:

```powershell
$env:PORT = '3001'
npm.cmd start
```

En ese caso abrir http://localhost:3001. Si aparece `EADDRINUSE`, detener la instancia anterior que ocupa el puerto o seleccionar otro.

## Estructura del proyecto

```text
Conversa/
├── server/
│   ├── server.js
│   ├── services/
│   │   ├── messageService.js
│   │   ├── pinService.js
│   │   ├── privateMessageService.js
│   │   ├── sessionService.js
│   │   └── userService.js
│   └── socket/
│       ├── connectionHandler.js
│       ├── messageHandler.js
│       ├── pinHandler.js
│       ├── presenceHandler.js
│       ├── privateMessageHandler.js
│       ├── privateTypingHandler.js
│       ├── reactionHandler.js
│       ├── searchHandler.js
│       ├── typingHandler.js
│       └── userHandler.js
├── public/
│   ├── index.html
│   ├── favicon.svg
│   ├── css/
│   │   ├── accessibility.css
│   │   ├── components.css
│   │   ├── composer.css
│   │   ├── layout.css
│   │   ├── messages.css
│   │   ├── private.css
│   │   ├── responsive.css
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── emojiPicker.js
│       ├── icons.js
│       ├── messageActions.js
│       ├── messageDeletion.js
│       ├── messageEditor.js
│       ├── messageSearch.js
│       ├── pinnedMessages.js
│       ├── presence.js
│       ├── privateMessageFeatures.js
│       ├── privateMessages.js
│       ├── privateTyping.js
│       ├── reactionEmojis.js
│       ├── reactions.js
│       ├── replies.js
│       ├── socket.js
│       ├── typing.js
│       ├── ui.js
│       ├── unreadMessages.js
│       ├── unreadState.mjs
│       └── workspace.js
├── tests/
│   ├── chat.test.js
│   ├── pin.test.js
│   ├── private-features.test.js
│   ├── reconnection.test.js
│   └── unread.test.js
├── scripts/
│   └── crear-entrega.ps1
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

`server.js` configura HTTP y Socket.IO; `socket/` registra y valida las operaciones; `services/` administra usuarios, sesiones y mensajes. En el navegador, `socket.js` concentra la comunicación, `app.js` coordina el ingreso y el chat, `ui.js` actualiza el DOM y los demás módulos atienden cada función. `style.css` importa los estilos separados por responsabilidad. Los textos del usuario se representan con `textContent`.

## Funcionalidades base

Ingreso con nombre único entre usuarios conectados, grupo inicial General, mensajes con UUID, autor y hora, lista de conectados, notificaciones de entrada/salida, edición sincronizada y estado de conexión. La autoría de las ediciones y eliminaciones se valida en el servidor. Los visitantes que aún no ingresan no reciben los eventos del grupo.

La hora de cada mensaje se registra en el servidor como una marca de tiempo UTC (formato ISO 8601), que representa un instante común para todos los usuarios. Al mostrarla, el navegador la convierte automáticamente a la zona horaria local del dispositivo de cada usuario. Por eso, un mismo mensaje puede mostrar horas distintas según la región, aunque corresponde al mismo instante. La conversión no requiere cálculos manuales; la hora registrada depende de que el reloj del servidor esté correctamente sincronizado.

## Retos implementados

Los cinco seleccionados para la parte obligatoria son **1, 3, 4, 6 y 9**. Se implementaron otros siete: **12 retos en total**. La bonificación está sujeta a demostración y evidencia y tiene un máximo de **+1 punto**.

| N.º | Reto | Alcance y funcionamiento técnico |
| --- | --- | --- |
| 1 | Está escribiendo | General: `typing:start/stop`. Privados: `private:typing:start/stop`, solo hacia el destinatario. Parada por inactividad de 1,5 s y expiración de respaldo en el servidor a los 3 s. El borrador no se transmite. |
| 2 | Confirmación de lectura | Privados: Enviado tras aceptación del servidor, Recibido mediante `private:received` del destinatario y Leído mediante `private:read` al visualizar el mensaje en la conversación activa. |
| 3 | Reacciones | General y privados: 12 emojis; una reacción por persona y mensaje. Elegir otra la reemplaza; repetirla la quita. Eventos `reaction:toggle/update` y `private:reaction`. |
| 4 | Eliminar mensajes | General y privados: confirmación en la interfaz y validación de autoría. Se borra el contenido y se muestra Mensaje eliminado a los participantes. |
| 6 | Mensajes privados | `private:message` se entrega solo al emisor y destinatario. Lista de contactos bajo demanda, borradores separados, aviso de nuevos mensajes y bloqueo de envío a desconectados. |
| 8 | Última conexión | `disconnectedAt`, generado por el servidor al detectar la salida y distribuido por `presence:update`. Se muestra en Desconectados recientes. |
| 9 | Reconexión automática | Reconexión de Socket.IO y recuperación mediante sesión firmada con HMAC. Se mantiene una identidad independiente del socket y se sincroniza el historial grupal disponible. |
| 10 | Mensajes no leídos | Contador de mensajes ajenos en General cuando no se está leyendo al final; contadores por conversación y en la navegación de privados. |
| 11 | Responder mensajes | General y privados: envío de `replyTo`; el servidor construye la cita y comprueba que el original pertenezca a la conversación. Las citas se actualizan al editar o eliminar el original. |
| 12 | Buscar mensajes | `message:search`: busca contenido del historial grupal, sin distinguir mayúsculas; excluye privados y eliminados. Consulta de 2 a 100 caracteres; hasta 50 resultados recientes. |
| 13 | Fijar mensajes | General: un destacado común mediante `message:pin/unpin` y `pin:update`. Se actualiza al editarlo y se retira al eliminarlo o salir del historial. |
| 14 | Estados de presencia | `presence:set/update`: En línea, Ausente al perder foco/ocultar pestaña o pasar 60 s sin actividad, y Desconectado al salir. |

Las acciones privadas adicionales usan `private:edit`, `private:delete` y `private:reaction`. El servidor comprueba participación y autoría y nunca difunde sus cambios al grupo. Solo el destinatario puede confirmar recepción y lectura; el estado Leído refleja visualización reportada por el cliente, no comprensión del contenido.

## Uso de la interfaz

- **General:** conversación compartida por todos los usuarios ingresados.
- **Mensajes privados:** seleccionar un contacto; la flecha del encabezado permite cambiarlo. También se puede abrir un privado desde el botón junto a un usuario.
- **Menú de tres puntos:** responder, reaccionar y, en mensajes propios, editar o eliminar. Fijar está disponible en General.
- **Campana:** entradas, salidas y mensajes ajenos de General o privados. Los avisos de privados permiten abrir al remitente.
- **Buscar:** botón superior o Ctrl/Cmd + K.
- **Enter:** enviar. **Shift + Enter:** nueva línea. El selector de emojis inserta en la posición del cursor.
- En celular, el menú abre la navegación. El panel de detalles se abre bajo demanda y no modifica el ancho del chat al cambiar entre General y Privados.

## Estado y sesiones

- El historial grupal conserva los últimos **200 mensajes en memoria**. Al reiniciar el servidor se pierde.
- El servidor conserva hasta **200 privados por pareja y 100 conversaciones** para validar acciones. La vista privada del cliente se limpia al recargar o desconectarse; no se recupera automáticamente ese historial.
- Los usuarios conectados y la presencia se reconstruyen con las conexiones. Se conservan hasta 100 desconectados en memoria y se muestran los 10 más recientes.
- La sesión del navegador se guarda en `sessionStorage` y vence a los 7 días. Permite recuperar identidad, nombre y permisos sobre mensajes que todavía estén disponibles.
- En el primer inicio se genera `.data/session-key`, utilizada para firmar las sesiones. Se conserva localmente entre reinicios. Como alternativa se puede configurar `SESSION_SECRET`. Cambiar la clave invalida las sesiones anteriores.
- La clave de sesión y `.data/` se excluyen del ZIP. Cada instalación genera su propia clave. No se necesitan credenciales incluidas en el código para ejecutar el proyecto.

## Pruebas automatizadas

```sh
npm test
```

En PowerShell: `npm.cmd test`. La suite contiene cinco pruebas de nivel superior con verificaciones de comunicación, permisos, presencia, privados, acuses, citas, reacciones, destacados, reconexión y no leídos. Los servidores de prueba usan **3127, 3128 y 3134**, independientemente del puerto 3000 de la aplicación; esos tres puertos deben estar libres. La prueba de destacados y la de no leídos también verifican estado directamente sin abrir un servidor.

## Prueba multiusuario y desconexión

1. Iniciar el servidor y abrir dos navegadores, perfiles o ventanas de incógnito con nombres distintos.
2. Comprobar que ambos aparecen conectados y enviar mensajes en los dos sentidos.
3. Editar un mensaje propio y comprobar la modificación en ambos clientes. Probar reacciones y eliminación.
4. Abrir un tercer cliente y comprobar que no recibe los privados intercambiados entre los otros dos.
5. Cerrar un cliente y comprobar los cambios de presencia y última conexión.
6. Detener el servidor con Ctrl + C y comprobar Desconectado / Reconectando. Ejecutar otra vez `npm start`: las sesiones deben recuperarse automáticamente; el historial se vacía por ser temporal.

Una pestaña duplicada puede copiar la sesión y representar al mismo usuario. Para simular personas distintas, utilizar incógnito, otro perfil o un navegador diferente.

## Acceso desde otro dispositivo mediante túnel

Después de comprobar el funcionamiento local, mantener el servidor ejecutándose y utilizar un túnel. Con VS Code:

1. Abrir la vista **Ports / Puertos** desde la paleta de comandos (`Ports: Focus on Ports View`).
2. Seleccionar **Forward a Port** e indicar `3000`, o el puerto configurado.
3. Completar el inicio de sesión que solicite el editor y configurar **Port Visibility > Public** si el cliente externo necesita acceder sin esa cuenta.
4. Copiar la URL HTTPS generada y abrirla en el teléfono, preferiblemente con datos móviles y Wi-Fi desactivado.
5. Ingresar con otro nombre y comprobar presencia e intercambio de mensajes en ambos sentidos. En el teléfono se utiliza la URL pública, no localhost.
6. Mantener computador, servidor y túnel activos durante la prueba y detener la publicación al terminar. Una URL pública permite acceder a quien la conozca.

El cliente conecta Socket.IO al mismo origen desde el que se carga la página. Las capturas y los resultados de la prueba externa se documentan en el informe del laboratorio; estas instrucciones no sustituyen esa evidencia.
