from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_token
from app.db.supabase_client import supabase
from app.services.rag.document_processor import (
    extract_from_pdf, extract_from_text,
    extract_from_url, chunk_text
)
from app.services.rag.vector_store import add_documents, delete_collection
from app.services.rag.chat_service import chat_with_rag

router = APIRouter()


# ── Document Upload ───────────────────────────────────────────────────────────

@router.post("/upload/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    title: str = Form(...),
    user_id: str = Depends(verify_token)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    try:
        file_bytes = await file.read()
        text = extract_from_pdf(file_bytes)

        if not text or len(text) < 50:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        chunks = chunk_text(text)
        collection_name = f"user_{user_id}"

        result = supabase.table("documents").insert({
            "user_id": user_id,
            "title": title,
            "source_type": "pdf",
            "content": text[:500],
            "chunk_count": len(chunks),
            "collection_name": collection_name,
        }).execute()

        doc_id = result.data[0]["id"]
        add_documents(collection_name, chunks, doc_id, title)

        return {"message": "PDF uploaded", "doc_id": doc_id, "chunks": len(chunks)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TextUploadRequest(BaseModel):
    title: Optional[str] = ""
    content: str


@router.post("/upload/text")
async def upload_text(
    req: TextUploadRequest,
    user_id: str = Depends(verify_token)
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    try:
        text = extract_from_text(req.content)
        chunks = chunk_text(text)
        collection_name = f"user_{user_id}"

        result = supabase.table("documents").insert({
            "user_id": user_id,
            "title": req.title or "Text Document",
            "source_type": "text",
            "content": text[:500],
            "chunk_count": len(chunks),
            "collection_name": collection_name,
        }).execute()

        doc_id = result.data[0]["id"]
        add_documents(collection_name, chunks, doc_id, req.title or "Text Document")

        return {"message": "Text uploaded", "doc_id": doc_id, "chunks": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class URLUploadRequest(BaseModel):
    url: str
    title: Optional[str] = ""


@router.post("/upload/url")
async def upload_url(
    req: URLUploadRequest,
    user_id: str = Depends(verify_token)
):
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    try:
        text = extract_from_url(req.url)
        if len(text) < 100:
            raise HTTPException(status_code=400, detail="Could not extract enough content from URL")

        chunks = chunk_text(text)
        collection_name = f"user_{user_id}"

        result = supabase.table("documents").insert({
            "user_id": user_id,
            "title": req.title or req.url,
            "source_type": "url",
            "source_url": req.url,
            "content": text[:500],
            "chunk_count": len(chunks),
            "collection_name": collection_name,
        }).execute()

        doc_id = result.data[0]["id"]
        add_documents(collection_name, chunks, doc_id, req.title or req.url)

        return {"message": "URL processed", "doc_id": doc_id, "chunks": len(chunks)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def list_documents(user_id: str = Depends(verify_token)):
    result = supabase.table("documents")\
        .select("id, title, source_type, source_url, chunk_count, created_at")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .execute()
    return result.data


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user_id: str = Depends(verify_token)):
    supabase.table("documents")\
        .delete()\
        .eq("id", doc_id)\
        .eq("user_id", user_id)\
        .execute()
    return {"message": "Deleted"}


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_rag: bool = True


@router.post("/chat")
async def chat(req: ChatRequest, user_id: str = Depends(verify_token)):
    try:
        # Session তৈরি বা fetch করো
        if req.session_id:
            session_id = req.session_id
        else:
            session_result = supabase.table("chat_sessions").insert({
                "user_id": user_id,
                "title": req.message[:50],
            }).execute()
            session_id = session_result.data[0]["id"]

        # Chat history fetch করো
        history_result = supabase.table("chat_messages")\
            .select("role, content")\
            .eq("session_id", session_id)\
            .order("created_at")\
            .execute()
        history = history_result.data or []

        # RAG chat
        collection_name = f"user_{user_id}"
        response = chat_with_rag(
            user_message=req.message,
            collection_name=collection_name,
            chat_history=history,
            use_rag=req.use_rag,
        )

        # User message save করো
        supabase.table("chat_messages").insert({
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": req.message,
        }).execute()

        # Assistant message save করো
        supabase.table("chat_messages").insert({
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": response["content"],
            "sources": response["sources"],
        }).execute()

        return {
            "session_id": session_id,
            "message": response["content"],
            "sources": response["sources"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def list_sessions(user_id: str = Depends(verify_token)):
    result = supabase.table("chat_sessions")\
        .select("id, title, created_at, updated_at")\
        .eq("user_id", user_id)\
        .order("updated_at", desc=True)\
        .execute()
    return result.data


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, user_id: str = Depends(verify_token)):
    result = supabase.table("chat_messages")\
        .select("role, content, sources, created_at")\
        .eq("session_id", session_id)\
        .eq("user_id", user_id)\
        .order("created_at")\
        .execute()
    return result.data


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(verify_token)):
    supabase.table("chat_messages")\
        .delete()\
        .eq("session_id", session_id)\
        .execute()
    supabase.table("chat_sessions")\
        .delete()\
        .eq("id", session_id)\
        .execute()
    return {"message": "Deleted"}