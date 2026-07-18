const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString().split('T')[1].slice(0, 8)} - ${req.method} ${req.url}`);

  // Decode and Normalize URL path to prevent directory traversal
  let decodedUrl = req.url;
  try {
    decodedUrl = decodeURIComponent(req.url);
  } catch (e) {
    // Ignore URI error
  }
  let safeUrlPath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, '');
  if (safeUrlPath === '\\' || safeUrlPath === '/') {
    safeUrlPath = '/index.html';
  }

  const filePath = path.join(__dirname, safeUrlPath);

  // Check if file exists and is not a directory
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file not found, try appending .html (fallback search)
      const fallbackHtmlPath = filePath + '.html';
      fs.stat(fallbackHtmlPath, (fbErr, fbStats) => {
        if (!fbErr && fbStats.isFile()) {
          serveFile(fallbackHtmlPath, '.html', res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    serveFile(filePath, ext, res);
  });
});

function serveFile(filePath, ext, res) {
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`500 Server Error: ${err.code}`);
      return;
    }
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log('\n\x1b[32m%s\x1b[0m', '  ==================================================');
  console.log('\x1b[32m%s\x1b[0m', '    🚀 LOCAL SERVER STARTED SUCCESSFULLY');
  console.log('\x1b[32m%s\x1b[0m', '  ==================================================');
  console.log(`    👉 Main Website:  \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
  console.log(`    👉 Admin Console: \x1b[36mhttp://localhost:${PORT}/admin.html\x1b[0m`);
  console.log('\x1b[32m%s\x1b[0m', '  ==================================================\n');
});
