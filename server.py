
import http.server
import socketserver
import json

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        print('\n--- BROWSER ERROR ---')
        print(post_data)
        print('---------------------\n')
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')

socketserver.ThreadingTCPServer.allow_reuse_address = True
httpd = socketserver.ThreadingTCPServer(('', 8003), MyHandler)
print('Server running on port 8003 with CORS')
httpd.serve_forever()

