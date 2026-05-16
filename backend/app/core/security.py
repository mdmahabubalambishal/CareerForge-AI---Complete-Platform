from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from .config import settings

security = HTTPBearer()

# Supabase client দিয়ে token verify করো — algorithm নিয়ে চিন্তা নেই
def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        # Supabase admin client দিয়ে user fetch করো
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        result = supabase.auth.get_user(token)

        if not result or not result.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return result.user.id

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")