"""Combines the nine documentation PDFs into one file with bookmarks.

    python docs/source/merge.py

Needs pypdf (pip install pypdf). Run after node docs/source/build.mjs.
"""
import glob
import os

from pypdf import PdfReader, PdfWriter

here = os.path.dirname(os.path.abspath(__file__))
docs = os.path.dirname(here)
out = os.path.join(docs, "Back To Eden - Complete Documentation.pdf")

writer = PdfWriter()
for path in sorted(glob.glob(os.path.join(docs, "BTE-DOC-*.pdf"))):
    start = len(writer.pages)
    writer.append(PdfReader(path))
    writer.add_outline_item(os.path.splitext(os.path.basename(path))[0], start)

writer.add_metadata({"/Title": "Back To Eden - Complete Documentation", "/Subject": "Project documentation set"})
with open(out, "wb") as f:
    writer.write(f)
print(f"{os.path.basename(out)}: {len(writer.pages)} pages")
