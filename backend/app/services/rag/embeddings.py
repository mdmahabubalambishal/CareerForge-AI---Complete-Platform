from sentence_transformers import SentenceTransformer
import numpy as np

# Model একবার load হবে — memory তে থাকবে
_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()

def embed_query(query: str) -> list[float]:
    model = get_model()
    embedding = model.encode([query], show_progress_bar=False)
    return embedding[0].tolist()