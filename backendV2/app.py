from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.auth import router as auth_router
from .routers.consents import router as consents_router
from .routers.dashboard import router as dashboard_router
from .routers.profile import router as profile_router

app = FastAPI(title="Monetrix API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(consents_router)
app.include_router(dashboard_router)
app.include_router(profile_router)
