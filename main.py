import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from database import init_db
from routes.auth import router as auth_router
from routes.capabilities import router as capabilities_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(title="CareerOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(capabilities_router)
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
app.mount("/assets", StaticFiles(directory="frontend"), name="assets")

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def root():
    return RedirectResponse("/frontend/index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8078"))
    uvicorn.run(app, host="0.0.0.0", port=port)
