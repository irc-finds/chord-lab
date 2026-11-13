"""Builds the SANDBOX pages from sandbox/src/. Run: python3 sandbox/build.py (the main app is untouched)"""
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"


APPBAR = (SRC / "appbar.html").read_text()


def part(name: str) -> str:
    return APPBAR.split(f"<!--{name}-->", 1)[1].split(f"<!--/{name}-->", 1)[0].strip("\n")


def page(body: str, name: str = "") -> str:
    # The sources are written as page fragments (head tags + styles, then content).
    # Wrap them into full HTML documents for GitHub Pages.
    body = (body.replace("<!--APPBAR_HEAD-->", part("APPBAR_HEAD")).replace("/*APPBAR_CSS*/", part("APPBAR_CSS"))
            .replace("<!--APPBAR_NAV-->", part("APPBAR_NAV")))
    head, rest = body.split("</style>", 1)
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head + "</style>\n</head>\n" + (f'<body data-page="{name}">' if name else "<body>") + "\n" + rest.strip() + "\n</body>\n</html>\n"
    )


shell = (SRC / "shell.html").read_text()
finder = (SRC / "finder.js").read_text().replace(
    "if (typeof module !== 'undefined') module.exports = { parseChordName, findVoicings };", "")
gpimport = (SRC / "gpimport.js").read_text().replace("if (typeof module !== 'undefined') module.exports = { gpTrackInfo, gpBestTrack, gpToParts };", "")
app = shell.replace("/*CHORD_ENGINE*/", (SRC / "chord.js").read_text()).replace("/*FINDER*/", finder).replace("/*GPIMPORT*/", gpimport)
(ROOT / "finder.html").write_text(page(app, "finder"))
(ROOT / "index.html").write_text(page((SRC / "home.html").read_text(), "home"))


def block(src: str, a: str, b: str) -> str:
    i = src.index(a)
    return src[i:src.index(b, i)]


# Songs shares the Analyzer's sound engine, chord naming and voicing search
synth = "\n".join([block(shell, "  const DEFAULT_ORDER", "  function freshProg()"), block(shell, "  const pct = v =>", "  function soundChanged()"),
                   block(shell, "  let fx = null;", "  // tone: 0 = bright thin string"), block(shell, "  // tone: 0 = bright thin string", "  function voice("),
                   block(shell, "  function palmAt(v, t) {", "  // 12-string course")])
songs = ((SRC / "songs.html").read_text().replace("/*CL_SYNTH*/", synth).replace("/*CL_CHORD*/", (SRC / "chord.js").read_text())
         .replace("/*CL_FINDER*/", finder))
(ROOT / "songs.html").write_text(page(songs, "songs"))
print("built sandbox: index.html (home), finder.html, songs.html")
