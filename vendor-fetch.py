import urllib.request,json,tarfile,io,pathlib,hashlib
root=pathlib.Path('/workspace/side/merged/vendor')
libs=[('@tsparticles/slim','tsParticles','tsparticles.slim.bundle.min.js'),('canvas-confetti','canvas-confetti','confetti.browser.min.js'),('phaser','phaser','phaser.min.js'),('kaplay','kaplay','kaplay.js'),('matter-js','matter.js','matter.min.js'),('chess.js','chess.js','chess.js')]
for pkg,dest,out in libs:
 meta=json.load(urllib.request.urlopen('https://registry.npmjs.org/'+pkg+'/latest'))
 data=urllib.request.urlopen(meta['dist']['tarball']).read(); tar=tarfile.open(fileobj=io.BytesIO(data),mode='r:gz'); names=tar.getnames(); d=root/dest;d.mkdir(exist_ok=True)
 candidates={'tsParticles':['package/tsparticles.slim.bundle.min.js'],'canvas-confetti':['package/dist/confetti.browser.js'],'phaser':['package/dist/phaser.min.js'],'kaplay':['package/dist/kaplay.js'],'matter.js':['package/build/matter.min.js'],'chess.js':['package/dist/esm/chess.js']}[dest]
 f=next((x for x in candidates if x in names),None)
 if not f: raise Exception((pkg,names))
 (d/out).write_bytes(tar.extractfile(f).read())
 lic=next(n for n in names if n.lower().split('/')[-1] in ['license','license.md','license.txt'])
 (d/'LICENSE').write_bytes(tar.extractfile(lic).read())
 (d/'SOURCE.md').write_text(f"{pkg} {meta['version']}\nSource: {meta['dist']['tarball']}\nArchive SHA256: {hashlib.sha256(data).hexdigest()}\nBundled file: {f}\n")
 print(pkg,meta['version'],f)
