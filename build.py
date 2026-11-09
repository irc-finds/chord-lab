"""Builds the web pages from src/. Run: python3 build.py"""
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"


def page(body: str) -> str:
    # The sources are written as page fragments (head tags + styles, then content).
    # Wrap them into full HTML documents for GitHub Pages.
    head, rest = body.split("</style>", 1)
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head + "</style>\n</head>\n<body>\n" + rest.strip() + "\n</body>\n</html>\n"
    )


shell = (SRC / "shell.html").read_text()
finder = (SRC / "finder.js").read_text().replace(
    "if (typeof module !== 'undefined') module.exports = { parseChordName, findVoicings };", "")
app = shell.replace("/*CHORD_ENGINE*/", (SRC / "chord.js").read_text()).replace("/*FINDER*/", finder)
(ROOT / "index.html").write_text(page(app))
(ROOT / "dsharp-chart.html").write_text(page((SRC / "dsharp-chart.html").read_text()))
print("built index.html and dsharp-chart.html")
