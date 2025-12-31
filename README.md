# Planejador Acadêmico UFRPE

Aplicação web completa para planejamento acadêmico de alunos do curso de Ciência da Computação da UFRPE. Desenvolvida com uma arquitetura cliente-servidor moderna, utilizando **Python (FastAPI)** no backend e **HTML5/CSS3/JavaScript Vanilla** no frontend.

## 🏗️ Arquitetura

### Backend (Python/FastAPI)
- **Separação de Responsabilidades**: Módulos independentes para lógica de negócio, importação de CSV e gerenciamento de dados
- **API RESTful**: Endpoints bem definidos para todas as operações
- **Validação de Dados**: Regras de negócio UFRPE implementadas em classes dedicadas
- **Persistência**: Dados armazenados em JSON com suporte a múltiplos semestres

### Frontend (HTML/CSS/JavaScript)
- **Modularizado**: Separação entre HTML estrutural, CSS de estilos e JavaScript de lógica
- **Responsivo**: Interface adaptável para diferentes tamanhos de tela
- **Sem Dependências Externas**: Utiliza apenas JavaScript vanilla
- **Componentes Reutilizáveis**: Cards, modais, tabelas e formulários bem estruturados

## 📁 Estrutura do Projeto

```
academic_planner_ufrpe/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # Aplicação FastAPI principal
│   │   ├── models.py               # Modelos Pydantic
│   │   ├── database.py             # Gerenciamento de dados
│   │   ├── business_logic.py       # Lógica de negócio
│   │   ├── csv_importer.py         # Importação de CSV
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── disciplines.py      # Rotas de disciplinas
│   │       └── enrollments.py      # Rotas de matrículas
│   ├── requirements.txt            # Dependências Python
│   └── data/                       # Arquivos de dados (JSON)
├── frontend/
│   ├── index.html                  # HTML principal
│   ├── src/
│   │   ├── css/
│   │   │   └── styles.css          # Estilos CSS
│   │   └── js/
│   │       ├── api.js              # Cliente HTTP e endpoints
│   │       └── ui.js               # Lógica de interface
│   └── exemplo_disciplinas.csv     # Arquivo CSV de exemplo
├── README.md                       # Este arquivo
└── ARQUITETURA.md                  # Documentação técnica
```

## 🚀 Como Executar

### Pré-requisitos
- Python 3.8+
- pip (gerenciador de pacotes Python)
- Navegador web moderno

### 1. Instalar Dependências do Backend

```bash
cd academic_planner_ufrpe/backend
pip install -r requirements.txt
```

### 2. Iniciar o Backend

```bash
cd academic_planner_ufrpe/backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API estará disponível em: `http://localhost:8000`

**Documentação interativa da API:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Abrir o Frontend

Abra o arquivo `frontend/index.html` em um navegador web:

```bash
# Opção 1: Abrir diretamente
open academic_planner_ufrpe/frontend/index.html

# Opção 2: Usar um servidor local (recomendado)
cd academic_planner_ufrpe/frontend
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

## 📚 Funcionalidades Principais

### Dashboard
- Visualização de progresso do curso com barra de progresso
- Estatísticas gerais (disciplinas matriculadas, média geral)
- Cards das disciplinas do semestre ativo

### Agenda Semanal
- Tabela visual com horários de Segunda a Sexta
- Visualização de conflitos de horários
- Informações de local e professor

### Fluxograma
- Disciplinas organizadas por período (Nível 1 a 9)
- Código de cores por status:
  - 🟢 Verde: Concluída (média ≥ 7.0)
  - 🔵 Azul: Disponível (pré-requisitos atendidos)
  - ⚫ Cinza: Bloqueada (pré-requisitos não atendidos)
- Visualização de pré-requisitos ao clicar

### Painel de Notas
- Entrada de notas N1, N2 e N3
- Cálculo automático de média (UFRPE)
- Simulador de prova final
- Histórico de notas

### Gerenciamento (Admin)
- **Importação CSV**: Upload de arquivo com múltiplas disciplinas
- **CRUD Completo**: Criar, editar e deletar disciplinas
- **Catálogo**: Visualização de todas as disciplinas

## 🧮 Regras de Negócio UFRPE

### Cálculo de Média
A média final é a **média das duas maiores notas** entre N1, N2 e N3.

**Exemplo:**
- N1: 6.0, N2: 8.0, N3: 7.0
- Média: (8.0 + 7.0) / 2 = **7.5** ✓ Aprovado

### Simulador de Prova Final
Se a média das duas maiores notas for **< 7.0 e ≥ 3.0**, calcula-se a nota necessária na final:

**Fórmula:** Nota Final = 10 - Média

**Exemplo:**
- N1: 4.0, N2: 5.0, N3: 6.0
- Média: (6.0 + 5.0) / 2 = 5.5
- Nota necessária na final: 10 - 5.5 = **4.5**

### Validação de Pré-requisitos
Uma disciplina só pode ser cursada se seus pré-requisitos estiverem marcados como "Concluídos" (média ≥ 7.0).

### Detecção de Conflitos de Horários
O sistema verifica automaticamente se há choque de horários ao matricular uma disciplina.

## 📊 Dados de Exemplo

O sistema inclui dados iniciais baseados no curso **CCP02 (Ciência da Computação)** da UFRPE:

### 1º Nível (5 disciplinas)
- 06418: Álgebra Vetorial e Linear para Computação
- 06507: Cálculo NI
- 14044: Introdução à Ciência da Computação
- 14117: Introdução à Programação I
- 14203: Matemática Discreta I

### 2º Nível (3 disciplinas)
- 06214: Algoritmos (Pré-requisito: 14117)
- 06508: Cálculo NII (Pré-requisito: 06507)
- 14204: Matemática Discreta II (Pré-requisito: 14203)

## 📥 Importação de CSV

### Formato Esperado

```
Código;Nome;Professor;Período;Local;Dia;Início;Fim;Pré-requisitos
14203;MATEMÁTICA DISCRETA I;Pablo Sampaio;1;A definir;3;16:00;18:00;
14117;INTRODUÇÃO À PROGRAMAÇÃO I;Péricles Miranda;1;A definir;1;14:00;16:00;
```

### Campos
- **Código**: ID único da disciplina
- **Nome**: Nome completo da disciplina
- **Professor**: Nome do professor
- **Período**: Nível (1-9)
- **Local**: Local da aula
- **Dia**: Dia da semana (1=Segunda, 2=Terça, ..., 5=Sexta)
- **Início**: Horário de início (HH:MM)
- **Fim**: Horário de término (HH:MM)
- **Pré-requisitos**: IDs de disciplinas separadas por vírgula (opcional)

### Exemplo de Arquivo
Um arquivo `exemplo_disciplinas.csv` está incluído no projeto para testes.

## 🔌 API Endpoints

### Disciplinas
```
GET    /api/disciplines              # Listar todas
GET    /api/disciplines/{code}       # Obter uma
POST   /api/disciplines              # Criar
PUT    /api/disciplines/{code}       # Atualizar
DELETE /api/disciplines/{code}       # Deletar
POST   /api/disciplines/import/csv   # Importar CSV
POST   /api/disciplines/{code}/grades # Definir notas
GET    /api/disciplines/{code}/grades # Obter notas
```

### Semestres
```
GET  /api/semesters                  # Listar todos
GET  /api/semesters/{code}           # Obter um
POST /api/semesters                  # Criar
GET  /api/semesters/{code}/enrolled  # Disciplinas matriculadas
```

### Matrículas
```
POST /api/enroll                     # Matricular
POST /api/unenroll                   # Desmatricular
GET  /api/progress                   # Progresso do curso
GET  /api/schedule/{semester_code}   # Cronograma
```

## 💾 Persistência de Dados

Os dados são armazenados em arquivos JSON no diretório `backend/data/`:
- `disciplines.json`: Todas as disciplinas
- `semesters.json`: Semestres cadastrados
- `enrollments.json`: Matrículas por semestre

## 🎨 Customização de Estilos

O arquivo `frontend/src/css/styles.css` utiliza variáveis CSS para fácil customização:

```css
:root {
    --primary-blue: #3b82f6;
    --primary-purple: #8b5cf6;
    --success-green: #10b981;
    /* ... mais variáveis */
}
```

## 🐛 Troubleshooting

### "Erro de conexão com a API"
- Verifique se o backend está rodando em `http://localhost:8000`
- Verifique o console do navegador (F12) para mais detalhes

### "Dados não estão sendo salvos"
- Verifique se o diretório `backend/data/` existe e tem permissões de escrita
- Verifique os logs do backend

### "Conflito de CORS"
- O backend está configurado para aceitar requisições de qualquer origem
- Se necessário, modifique `app/main.py` para restringir domínios

## 📝 Estrutura de Código

### Backend
- **models.py**: Modelos Pydantic para validação de dados
- **database.py**: Classe Database para persistência
- **business_logic.py**: Classes para cálculos e validações
- **csv_importer.py**: Parser de arquivos CSV
- **api/disciplines.py**: Rotas de disciplinas
- **api/enrollments.py**: Rotas de matrículas

### Frontend
- **index.html**: Estrutura HTML com componentes
- **styles.css**: Estilos CSS com variáveis e responsividade
- **api.js**: Cliente HTTP e endpoints da API
- **ui.js**: Lógica de interface e manipulação do DOM

## 🔐 Segurança

- Validação de entrada em todos os endpoints
- Tratamento de erros com mensagens apropriadas
- CORS habilitado (considere restringir em produção)

## 📈 Melhorias Futuras

- [ ] Autenticação de usuários
- [ ] Integração com Google Drive
- [ ] Exportação de relatórios em PDF
- [ ] Notificações de prazos
- [ ] Cálculo de Coeficiente de Rendimento (CR)
- [ ] Sugestões de disciplinas baseadas em pré-requisitos
- [ ] Modo escuro
- [ ] Sincronização com sistema acadêmico da UFRPE

## 📄 Licença

Este projeto é fornecido como exemplo educacional.

## 👨‍💻 Desenvolvido por

**Manus AI** - Dezembro 2024

---

Para mais informações técnicas, consulte o arquivo `ARQUITETURA.md`.
