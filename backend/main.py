from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, resume, writing, knowledge, jobs, interview, analytics, agents, portfolio, billing


app = FastAPI(title=settings.APP_NAME, version=settings.VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://career-forge-ai-complete-platform-i.vercel.app",  
        "https://*.vercel.app",
        "chrome-extension://amghaeacmdhhfklmmlhmlhfoppcjjldg",  # Chrome extension
        "chrome-extension://*",  # Allow all extensions (development)

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(resume.router, prefix="/api/v1/resume", tags=["Resume"])
app.include_router(writing.router, prefix="/api/v1/writing", tags=["Writing"])
app.include_router(knowledge.router, prefix="/api/v1/knowledge", tags=["Knowledge"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["Interview"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])

@app.get("/")
async def root():
    return {"message": "CareerForge AI Backend"}

@app.get("/health")
async def health():
    return {"status": "healthy"}