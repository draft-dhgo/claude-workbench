import http = require('http');
import fs = require('fs');
import path = require('path');
import net = require('net');
import { BrowserWindow } from 'electron';
import { WikiHostStatus } from '../../shared/types/models';

class WikiHostService {
  private _server: http.Server | null = null;
  private _port: number | null = null;
  private _servingPath: string | null = null;

  async start(viewsPath: string): Promise<{ url: string; port: number }> {
    if (!fs.existsSync(viewsPath)) {
      throw new Error('VIEWS_DIR_NOT_FOUND');
    }

    if (!fs.existsSync(path.join(viewsPath, 'index.html'))) {
      throw new Error('INDEX_NOT_FOUND');
    }

    // 이미 실행 중이면 기존 정보 반환 (중복 생성 방지)
    if (this._server !== null) {
      return { url: `http://localhost:${this._port}`, port: this._port! };
    }

    const port = await this._findAvailablePort(8080, 8099);
    this._servingPath = path.resolve(viewsPath);
    this._server = http.createServer((req, res) => this._requestHandler(req, res));

    await new Promise<void>((resolve) => {
      this._server!.listen(port, '127.0.0.1', () => resolve());
    });

    this._port = port;
    this._sendStatusUpdate();

    return { url: `http://localhost:${port}`, port };
  }

  async stop(): Promise<void> {
    if (this._server === null) return;

    await new Promise<void>((resolve) => {
      this._server!.close(() => resolve());
    });

    this._server = null;
    this._port = null;
    this._servingPath = null;
    this._sendStatusUpdate();
  }

  getStatus(): WikiHostStatus {
    if (!this._server || this._port === null) {
      return { running: false };
    }
    return {
      running: true,
      url: `http://localhost:${this._port}`,
      port: this._port,
    };
  }

  isRunning(): boolean {
    return this._server !== null;
  }

  async cleanup(): Promise<void> {
    if (this._server) {
      await this.stop();
    }
  }

  _reset(): void {
    this._server = null;
    this._port = null;
    this._servingPath = null;
  }

  private async _findAvailablePort(start: number, end: number): Promise<number> {
    for (let port = start; port <= end; port++) {
      const available = await this._isPortAvailable(port);
      if (available) return port;
    }
    throw new Error('NO_AVAILABLE_PORT');
  }

  private _isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net.createServer();
      tester.once('error', () => resolve(false));
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, '127.0.0.1');
    });
  }

  private _requestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = new URL(req.url || '/', `http://localhost:${this._port}`);
    let pathname = parsedUrl.pathname;

    if (pathname === '/') {
      pathname = '/index.html';
    }

    const decodedPath = decodeURIComponent(pathname);
    const safePath = path.resolve(path.join(this._servingPath!, decodedPath));

    if (!safePath.startsWith(this._servingPath!)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(safePath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (fs.statSync(safePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const mimeType = this._getMimeType(safePath);
    res.writeHead(200, { 'Content-Type': mimeType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });

    const stream = fs.createReadStream(safePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  }

  private _getMimeType(filePath: string): string {
    const MIME_MAP: Record<string, string> = {
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
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.txt': 'text/plain; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8',
    };
    const ext = path.extname(filePath).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
  }

  private _sendStatusUpdate(): void {
    const win = this._getWindow();
    if (!win) return;
    win.webContents.send('wiki-host:status-update', this.getStatus());
  }

  private _getWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 ? windows[0] : null;
  }
}

export = WikiHostService;
