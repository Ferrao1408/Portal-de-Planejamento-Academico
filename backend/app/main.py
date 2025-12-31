"""
Aplicação FastAPI principal para o Planejador Acadêmico UFRPE.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import disciplines, enrollments

# Criar aplicação FastAPI
app = FastAPI(
    title="Planejador Acadêmico UFRPE",
    description="API para gerenciamento de planejamento acadêmico",
    version="1.0.0"
)

# Configurar CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(disciplines.router)
app.include_router(enrollments.router)


@app.get("/")
async def root():
    """Rota raiz da API."""
    return {
        "message": "Bem-vindo ao Planejador Acadêmico UFRPE",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Verificação de saúde da API."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
