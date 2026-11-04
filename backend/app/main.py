from fastapi import FastAPI

app = FastAPI(title="TimeMate AI")


@app.get("/")
def home():
    return {"message": "TimeMate AI backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
