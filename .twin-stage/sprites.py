exec(open('/workspace/side/merged/.twin-stage/build.py').read().split('with concurrent.futures.ThreadPoolExecutor')[0])
def sprite(n,color):
 r=req('/images/generations',{'model':os.environ['MODEL_IMAGE'],'prompt':f'Full body original Japanese anime game character, {color} haired adult woman age 27, tall mature adult proportions, elegant confident adult face, standing side view facing right with head three-quarter view, simple modest travel jacket and long pants and boots, {color} elemental sorceress, refined 2D hand painted beautiful illustration, plain white background no text no logos no border no other characters, entire body in frame, not chibi not a child.', 'response_format':'b64_json','size':'1024x1536','n':1})
 d=r['data'][0]
 if 'b64_json' not in d:print(n,'service did not return requested inline image');return
 (out/(n+'.png')).write_bytes(base64.b64decode(d['b64_json']));print(n,'complete',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
 fs=[ex.submit(sprite,'ice','blue'),ex.submit(sprite,'fire','copper red')]
 for f in fs:
  try:f.result()
  except Exception as e:print(type(e).__name__,str(e)[:100])
