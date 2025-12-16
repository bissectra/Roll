#!/usr/bin/env python3
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

class SPA_Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Try to serve the requested file
        path = self.translate_path(self.path)
        
        # If it's not a real file and not a directory, serve index.html
        if not os.path.isfile(path) and not os.path.isdir(path):
            self.path = '/index.html'
        
        return super().do_GET()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(('', port), SPA_Handler)
    print(f"Server running on http://localhost:{port}")
    server.serve_forever()
