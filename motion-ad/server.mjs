import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 File Not Found</h1>');
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      });
      res.end(content, 'utf-8');
    }
  });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name in interfaces) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses.length > 0 ? addresses[0] : '127.0.0.1';
}

const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n===========================================================');
  console.log('📱 TUTORSPACE MOTION CANVAS IS LIVE FOR YOUR PHONE!');
  console.log('===========================================================\n');
  console.log(`1. Make sure your Phone & Laptop are connected to the SAME WI-FI.`);
  console.log(`2. Open Safari or Chrome on your PHONE and enter:\n`);
  console.log(`   👉 http://${localIP}:${PORT}\n`);
  console.log(`3. It will run in native 1080x1920 (9:16) at smooth 60 FPS!`);
  console.log('===========================================================\n');
});
