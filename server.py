import io
import os
import tempfile
from typing import Optional, Union

import docx
import fitz  # PyMuPDF
import google.generativeai as genai
from PIL import Image
from flask import Flask, jsonify, request, send_from_directory


# ---------------------------------------------------------------------------
# Gemini configuration
# ---------------------------------------------------------------------------
GEMINI_API_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GOOGLE_API_KEY")
    or os.getenv("YOUR_API_KEY_HERE")
)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

if not GEMINI_API_KEY or "YOUR_API_KEY_HERE" in GEMINI_API_KEY:
    raise RuntimeError(
        "Set GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment before running the server."
    )

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(GEMINI_MODEL)


def _extract_from_image_source(image_source: Union[io.BytesIO, str, bytes]) -> str:
    """Extract Tamil text (printed + handwritten) from an image or bytes."""
    if isinstance(image_source, bytes):
        img = Image.open(io.BytesIO(image_source))
    elif isinstance(image_source, io.BytesIO):
        img = Image.open(image_source)
    else:
        img = Image.open(image_source)

    response = model.generate_content(
        [
            (
                "Extract ALL Tamil text (handwritten + printed) from this image. "
                "Return ONLY the text, no explanation."
            ),
            img,
        ]
    )
    return (response.text or "").strip()


def extract_text_from_pdf(path: str) -> str:
    """Extract Tamil text from normal / scanned PDFs."""
    doc = fitz.open(path)
    collected = []

    for page in doc:
        text = page.get_text()
        if text.strip():
            collected.append(text.strip())
            continue

        # Image-based page → convert to bitmap and send to Gemini
        pix = page.get_pixmap(dpi=300)
        img_bytes = pix.tobytes("png")
        collected.append(_extract_from_image_source(img_bytes))

    return "\n\n".join(filter(None, collected)).strip()


def extract_text_from_docx(path: str) -> str:
    doc = docx.Document(path)
    return "\n".join(p.text for p in doc.paragraphs).strip()


def extract_text_from_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        return fh.read()


def extract_any(path: str) -> str:
    ext = path.lower().split(".")[-1]

    if ext in ["jpg", "jpeg", "png", "bmp", "webp"]:
        with open(path, "rb") as fh:
            return _extract_from_image_source(fh.read())
    if ext == "pdf":
        return extract_text_from_pdf(path)
    if ext == "docx":
        return extract_text_from_docx(path)
    if ext == "txt":
        return extract_text_from_txt(path)

    raise ValueError("Unsupported file type")


# ---------------------------------------------------------------------------
# Flask application
# ---------------------------------------------------------------------------
app = Flask(
    __name__,
    static_folder=os.path.join("frontend", "dist"),
    static_url_path="",
)


@app.route("/api/extract", methods=["POST"])
def api_extract():
    if "file" not in request.files:
        return jsonify({"error": "No file received"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Filename missing"}), 400

    suffix = os.path.splitext(file.filename)[-1]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        file.save(tmp.name)
        text = extract_any(tmp.name)
        return jsonify({"text": text})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        tmp.close()
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path: Optional[str]):
    if not app.static_folder or not os.path.isdir(app.static_folder):
        return jsonify({"error": "Frontend build not found"}), 404

    target = os.path.join(app.static_folder, path)
    if path and os.path.exists(target):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)