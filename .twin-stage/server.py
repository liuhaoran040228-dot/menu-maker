import http.server,os
class Handler(http.server.SimpleHTTPRequestHandler):
 def translate_path(self,path):
  p=super().translate_path(path)
  if path.startswith('/twin-echo/'):
   return p.replace('/workspace/side/merged/twin-echo/','/workspace/side/merged/.twin-stage/twin-echo/',1)
  return p
os.chdir('/workspace/side/merged')
http.server.ThreadingHTTPServer(('127.0.0.1',18896),Handler).serve_forever()
