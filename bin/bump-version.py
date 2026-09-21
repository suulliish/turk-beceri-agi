#!/usr/bin/env python3
"""index.html icindeki CSS/JS baglantilarina yeni surum etiketi yazar.

GitHub Pages dosyalari 10 dakika onbellege alir. Surum etiketi degismezse
tarayici guncellenmis dosyayi degil, eski kopyasini kullanir. Her yayindan
once bu betigi calistir:

    python3 bin/bump-version.py

Etiket, dosyalarin icerigine gore uretilir: icerik degismediyse etiket de
degismez, yani gereksiz yeniden indirme olmaz.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

def content_tag() -> str:
    digest = hashlib.sha256()
    for path in sorted(list((ROOT / "assets/css").glob("*.css")) + list((ROOT / "assets/js").glob("*.js"))):
        digest.update(path.name.encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()[:10]

def main() -> int:
    if not INDEX.exists():
        print("index.html bulunamadi", file=sys.stderr)
        return 1
    html = INDEX.read_text(encoding="utf-8")
    tag = content_tag()
    new = re.sub(r'(href="assets/css/[^"?]+\.css)(\?v=[^"]*)?"', rf'\1?v={tag}"', html)
    new = re.sub(r'(src="assets/js/[^"?]+\.js)(\?v=[^"]*)?"', rf'\1?v={tag}"', new)
    if new == html:
        print(f"surum zaten guncel: {tag}")
        return 0
    INDEX.write_text(new, encoding="utf-8")
    count = len(re.findall(r'\?v=' + tag, new))
    print(f"surum etiketi yazildi: {tag} ({count} baglanti)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
