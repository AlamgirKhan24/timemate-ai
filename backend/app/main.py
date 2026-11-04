from fastapi import FastAPI

from app.api import auth, users

app = FastAPI(title="TimeMate AI")
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/")
def home():
    return {"message": "TimeMate AI backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
