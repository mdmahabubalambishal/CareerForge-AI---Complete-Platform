import chromadb
from chromadb.config import Settings
import os
from app.services.rag.embeddings import embed_texts, embed_query

# ChromaDB local storage
CHROMA_PATH = "./chroma_db"

def get_client():
    return chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=Settings(anonymized_telemetry=False)
    )


def get_or_create_collection(collection_name: str):
    client = get_client()
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )


def add_documents(collection_name: str, chunks: list[str], doc_id: str, title: str):
    """Chunks গুলো ChromaDB তে store করো"""
    collection = get_or_create_collection(collection_name)

    embeddings = embed_texts(chunks)

    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "title": title, "chunk_index": i} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )
    return len(chunks)


def search_documents(collection_name: str, query: str, n_results: int = 5) -> list[dict]:
    """Query দিয়ে relevant chunks খোঁজো"""
    try:
        collection = get_or_create_collection(collection_name)
        query_embedding = embed_query(query)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, collection.count()),
            include=["documents", "metadatas", "distances"]
        )

        chunks = []
        for i, doc in enumerate(results['documents'][0]):
            chunks.append({
                "content": doc,
                "title": results['metadatas'][0][i].get('title', ''),
                "doc_id": results['metadatas'][0][i].get('doc_id', ''),
                "score": 1 - results['distances'][0][i],
            })
        return chunks
    except Exception:
        return []


def delete_collection(collection_name: str):
    """Collection delete করো"""
    try:
        client = get_client()
        client.delete_collection(collection_name)
    except Exception:
        pass