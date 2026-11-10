"""
Local Development Server for CivicIntel Web Application
Serves the frontend application on http://localhost:8000 with clean routing.
"""

import http.server
import socketserver
import os
import sys

PORT = 8000
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")


class CleanRouterHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        # Route rewrites for clean URLs
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
        elif self.path == "/checkout":
            self.path = "/checkout.html"
        elif self.path == "/portal":
            self.path = "/portal.html"
        return super().do_GET()


def run_local_server():
    os.chdir(FRONTEND_DIR)
    handler = CleanRouterHTTPHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("=" * 70)
        print("CIVICINTEL LOCAL WEB SERVER ACTIVE")
        print("=" * 70)
        print(f"• Public Landing Page:  http://localhost:{PORT}/")
        print(f"• Territory Checkout:   http://localhost:{PORT}/checkout.html")
        print(f"• Member Portal:        http://localhost:{PORT}/portal.html?token=tok_live_demo")
        print("=" * 70)
        print("Press Ctrl+C to stop server.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    run_local_server()

