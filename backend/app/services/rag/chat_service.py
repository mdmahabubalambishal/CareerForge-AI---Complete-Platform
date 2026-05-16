from groq import Groq
from app.core.config import settings
from app.services.rag.vector_store import search_documents

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are CareerForge AI — an expert career assistant.
You help users with resume writing, job hunting, interview preparation, and career growth.
You can respond in both Bengali and English — match the language the user uses.
When answering, use the provided context from the user's documents if relevant.
Be concise, practical, and encouraging."""


def build_context(chunks: list[dict]) -> str:
    if not chunks:
        return ""
    context = "\n\n--- Relevant Documents ---\n"
    for i, chunk in enumerate(chunks, 1):
        context += f"\n[{i}] From '{chunk['title']}':\n{chunk['content']}\n"
    return context


def chat_with_rag(
    user_message: str,
    collection_name: str,
    chat_history: list[dict],
    use_rag: bool = True
) -> dict:
    """RAG-powered chat"""

    # Relevant chunks খোঁজো
    sources = []
    context = ""
    if use_rag and collection_name:
        chunks = search_documents(collection_name, user_message, n_results=4)
        if chunks:
            context = build_context(chunks)
            sources = [{"title": c["title"], "score": round(c["score"], 2)} for c in chunks]

    # Messages build করো
    messages = [{"role": "system", "content": SYSTEM_PROMPT + context}]

    # Chat history add করো (last 10 messages)
    for msg in chat_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Current message
    messages.append({"role": "user", "content": user_message})

    # Groq call
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.7,
        max_tokens=2000,
    )

    return {
        "content": response.choices[0].message.content,
        "sources": sources,
    }