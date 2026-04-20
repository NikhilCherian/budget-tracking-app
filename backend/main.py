from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import transactions, insights, households, categories, goals

app = FastAPI(title="Twospend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(insights.router,     prefix="/insights",     tags=["insights"])
app.include_router(households.router,   prefix="/households",   tags=["households"])
app.include_router(categories.router,   prefix="/categories",   tags=["categories"])
app.include_router(goals.router,        prefix="/goals",        tags=["goals"])


@app.get("/health")
def health():
    return {"status": "ok"}
