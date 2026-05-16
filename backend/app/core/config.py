from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    GROQ_API_KEY: str
    TAVILY_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    SSLCOMMERZ_STORE_ID: str = ""
    SSLCOMMERZ_STORE_PASS: str = ""
    APP_NAME: str = "CareerForge AI"
    VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()