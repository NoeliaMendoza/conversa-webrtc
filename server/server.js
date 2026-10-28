const path = require('node:path');
const fs = require('node:fs');
const envFile = path.join(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  const configured = { ...process.env }; process.loadEnvFile(envFile); Object.assign(process.env, configured);
}
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const registerConnections = require('./socket/connectionHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { transports: ['websocket'], maxHttpBufferSize: 16384 });

app.use(express.static(path.join(__dirname, '../public')));
registerConnections(io);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Conversa disponible en http://localhost:${port}`));
