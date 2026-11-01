#!/usr/bin/env python3
"""Serve the prebuilt guest preview on this computer; no cloud account needed."""
import argparse
import functools
import http.server
import json
import pathlib
import threading
import webbrowser

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path.startswith('/api/'):
            payload = {'code': 'PREVIEW_ONLY', 'message': 'This is a guest-only preview. Run the full source for backend development.'}
            code = 503
            if path == '/api/v1/config':
                payload = {'accountsEnabled': False, 'billingEnabled': False, 'contentReady': False}
                code = 200
            elif path == '/api/auth/get-session':
                payload = None
                code = 200
            elif path == '/api/health':
                payload = {'ok': True, 'mode': 'static-guest-preview', 'billing': False}
                code = 200
            body = json.dumps(payload).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    folder = pathlib.Path(__file__).resolve().parent
    server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(folder)))
    url = f'http://localhost:{args.port}'
    print(f'Physics Path guest preview: {url}\nOpen this address on THIS computer. Ctrl+C stops the preview.', flush=True)
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
