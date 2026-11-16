"""Corta as fontes embutidas em cada SVG de assets/ para só os caracteres usados nele.

Roda depois do gerar.mjs:  python scripts/otimizar_fontes.py
Precisa de: pip install fonttools brotli
"""
import base64
import glob
import io
import os
import re

from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FONTE = re.compile(r"url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)")
TEXTO = re.compile(r"<(?:text|title)\b[^>]*>(.*?)</(?:text|title)>", re.S)
ENT = {"&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"'}


def caracteres(svg):
    usados = set(" ")
    for trecho in TEXTO.findall(svg):
        trecho = re.sub(r"<[^>]+>", "", trecho)
        for k, v in ENT.items():
            trecho = trecho.replace(k, v)
        usados |= set(trecho)
    return usados


def cortar(b64, usados):
    fonte = TTFont(io.BytesIO(base64.b64decode(b64)))
    opcoes = subset.Options()
    opcoes.flavor = "woff2"
    opcoes.layout_features = ["*"]
    opcoes.name_IDs = ["*"]
    sub = subset.Subsetter(opcoes)
    sub.populate(unicodes=[ord(c) for c in usados])
    sub.subset(fonte)
    saida = io.BytesIO()
    fonte.flavor = "woff2"
    fonte.save(saida)
    return base64.b64encode(saida.getvalue()).decode()


antes = depois = 0
for caminho in sorted(glob.glob(os.path.join(RAIZ, "assets", "*.svg"))):
    with open(caminho, encoding="utf-8") as f:
        svg = f.read()
    if not FONTE.search(svg):
        continue
    usados = caracteres(svg)
    novo = FONTE.sub(lambda m: f"url(data:font/woff2;base64,{cortar(m.group(1), usados)})", svg)
    antes += len(svg.encode())
    depois += len(novo.encode())
    if novo != svg:
        with open(caminho, "w", encoding="utf-8", newline="\n") as f:
            f.write(novo)

print(f"Fontes cortadas: {antes / 1024:.0f} KB -> {depois / 1024:.0f} KB")
