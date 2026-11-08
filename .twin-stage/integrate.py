from pathlib import Path
p=Path('/workspace/side/merged/.twin-stage/twin-echo/game.js');s=p.read_text();levels=s[s.index('  const levels ='):s.index('  function init(')];Path('/workspace/side/merged/.twin-stage/levels.js').write_text(levels)
