import re
import requests
from pypdf import PdfReader
from bs4 import BeautifulSoup
import io


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Text কে chunks এ ভাগ করো"""
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def extract_from_pdf(file_bytes: bytes) -> str:
    """PDF bytes থেকে text extract করো"""
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text.strip()


def extract_from_text(text: str) -> str:
    """Plain text clean করো"""
    return re.sub(r'\s+', ' ', text).strip()


def extract_from_url(url: str) -> str:
    """URL থেকে text extract করো"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # Script, style remove করো
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        text = soup.get_text(separator=' ')
        return re.sub(r'\s+', ' ', text).strip()
    except Exception as e:
        raise ValueError(f"URL fetch failed: {str(e)}")