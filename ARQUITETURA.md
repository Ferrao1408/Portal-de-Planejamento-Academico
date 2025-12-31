# Arquitetura Técnica - Planejador Acadêmico UFRPE

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  index.html  │  │  styles.css  │  │  api.js / ui.js  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP/JSON
                             │ (CORS)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API Routes                         │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  /disciplines   │  │  /enrollments            │  │  │
│  │  │  /semesters     │  │  /schedule               │  │  │
│  │  │  /progress      │  │  /grades                 │  │  │
│  │  └─────────────────┘  └──────────────────────────┘  │  │
│  └──────────────┬─────────────────────────────────────┘  │
│                 │                                         │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │              Business Logic Layer                   │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐    │  │
│  │  │ Academic     │  │ Schedule Validation      │    │  │
│  │  │ Calculations │  │ Prerequisite Validation  │    │  │
│  │  │ Data         │  │ CSV Importer             │    │  │
│  │  │ Validation   │  │                          │    │  │
│  │  └──────────────┘  └──────────────────────────┘    │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │                                         │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │           Database Layer (JSON)                     │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐    │  │
│  │  │ disciplines  │  │ semesters                │    │  │
│  │  │ .json        │  │ .json                    │    │  │
│  │  │              │  │ enrollments.json         │    │  │
│  │  └──────────────┘  └──────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Componentes Principais

### Backend

#### 1. **main.py** - Aplicação FastAPI
- Inicializa a aplicação FastAPI
- Configura CORS para aceitar requisições do frontend
- Registra as rotas da API
- Fornece documentação interativa (Swagger/ReDoc)

#### 2. **models.py** - Modelos Pydantic
Define as estruturas de dados com validação automática:

```python
# Exemplo
class Discipline(DisciplineBase):
    schedules: List[ScheduleItem]
    n1: Optional[float]
    n2: Optional[float]
    n3: Optional[float]
    media_final: Optional[float]
```

#### 3. **database.py** - Camada de Persistência
Gerencia todos os dados em memória com persistência em JSON:

```python
class Database:
    - get_discipline(code)
    - create_discipline(data)
    - update_discipline(code, updates)
    - delete_discipline(code)
    - enroll_discipline(semester, discipline)
    - set_grades(discipline, n1, n2, n3)
    - get_progress()
```

#### 4. **business_logic.py** - Lógica de Negócio
Implementa as regras acadêmicas UFRPE:

```python
class AcademicCalculations:
    - calculate_ufrpe_average(n1, n2, n3)
    - calculate_final_exam_grade(average)
    - calculate_course_progress(completed_hours)
    - calculate_general_average(averages)

class ScheduleValidation:
    - check_time_overlap(start1, end1, start2, end2)
    - has_schedule_conflict(schedules1, schedules2)

class PrerequisiteValidation:
    - check_prerequisites(prerequisites, completed)
    - validate_discipline_status(prerequisites, completed)

class DataValidation:
    - validate_discipline_code(code)
    - validate_period(period)
    - validate_hours(hours)
    - validate_discipline_data(...)
```

#### 5. **csv_importer.py** - Importação de CSV
Parser robusto para arquivos CSV:

```python
class CSVImporter:
    - parse_csv(file_content)
    - import_from_file(file_content)
    - validate_csv_format(file_content)
    - _validate_time_format(time_str)
```

#### 6. **api/disciplines.py** - Rotas de Disciplinas
Endpoints para gerenciamento de disciplinas:

```
GET    /api/disciplines
GET    /api/disciplines/{code}
POST   /api/disciplines
PUT    /api/disciplines/{code}
DELETE /api/disciplines/{code}
POST   /api/disciplines/import/csv
POST   /api/disciplines/{code}/grades
GET    /api/disciplines/{code}/grades
```

#### 7. **api/enrollments.py** - Rotas de Matrículas
Endpoints para matrículas e progresso:

```
POST   /api/enroll
POST   /api/unenroll
GET    /api/semesters
GET    /api/semesters/{code}
POST   /api/semesters
GET    /api/semesters/{code}/enrolled
GET    /api/progress
GET    /api/schedule/{semester_code}
```

### Frontend

#### 1. **index.html** - Estrutura HTML
- Header com informações do semestre
- Navegação com 5 abas principais
- Componentes reutilizáveis (cards, modais, tabelas)
- Seção de notificações

#### 2. **styles.css** - Estilos CSS
Arquitetura CSS modular com:

```css
:root {
    /* Variáveis de cores, espaçamento, tipografia */
}

/* Componentes */
.card, .btn, .badge, .alert, .modal, etc.

/* Layouts */
.grid, .flex, .container, etc.

/* Responsividade */
@media (max-width: 768px) { ... }
@media (max-width: 480px) { ... }
```

#### 3. **api.js** - Cliente HTTP
Abstração para requisições HTTP:

```javascript
class APIClient {
    - static request(endpoint, options)
    - static get(endpoint)
    - static post(endpoint, data)
    - static put(endpoint, data)
    - static delete(endpoint)
    - static postFormData(endpoint, formData)
}

// Endpoints organizados por domínio
DisciplinesAPI, SemestersAPI, EnrollmentsAPI
```

#### 4. **ui.js** - Lógica de Interface
Gerenciamento da interface do usuário:

```javascript
// Inicialização
initializeApp()
setupEventListeners()

// Navegação
switchTab(tabName)

// Carregamento de dados
loadDashboard()
loadSchedule()
loadFlowchart()
loadGrades()
loadAdmin()

// Ações do usuário
openGradesModal(code)
saveGrades()
importCSV()
addDisciplineManually()
editDiscipline(code)
deleteDiscipline(code)
```

## 🔄 Fluxos Principais

### 1. Fluxo de Matrícula

```
User clicks "Enroll"
    ↓
Frontend: POST /api/enroll
    ↓
Backend: EnrollmentsAPI.enroll_discipline()
    ↓
Check Prerequisites
    ├─ If not met: Return error
    └─ If met: Continue
    ↓
Check Schedule Conflicts
    ├─ If conflict: Return error
    └─ If no conflict: Continue
    ↓
Database: enroll_discipline()
    ↓
Frontend: Show success notification
    ↓
Reload Dashboard
```

### 2. Fluxo de Cálculo de Notas

```
User enters N1, N2, N3
    ↓
Frontend: POST /api/disciplines/{code}/grades
    ↓
Backend: DisciplinesAPI.set_grades()
    ↓
Calculate UFRPE Average
    ├─ Average = (2 highest grades) / 2
    └─ Update discipline.media_final
    ↓
Check if Final Exam Needed
    ├─ If average >= 7.0: Approved
    ├─ If 3.0 <= average < 7.0: Calculate final grade needed
    └─ If average < 3.0: Failed
    ↓
Return result to Frontend
    ↓
Display average and final exam alert
```

### 3. Fluxo de Importação CSV

```
User selects CSV file
    ↓
Frontend: POST /api/disciplines/import/csv (FormData)
    ↓
Backend: DisciplinesAPI.import_csv()
    ↓
CSVImporter.validate_csv_format()
    ├─ Check headers
    └─ Check data rows
    ↓
CSVImporter.parse_csv()
    ├─ Parse each row
    ├─ Group by discipline code
    ├─ Validate data
    └─ Return list of disciplines
    ↓
Database: bulk_create_disciplines()
    ├─ Check if discipline already exists
    └─ Create new disciplines
    ↓
Return import summary
    ↓
Frontend: Show success with count
```

## 📊 Modelos de Dados

### Discipline
```json
{
  "code": "14203",
  "name": "MATEMÁTICA DISCRETA I",
  "professor": "Pablo Sampaio",
  "period": 1,
  "hours": 60,
  "schedules": [
    {
      "day": 3,
      "start": "16:00",
      "end": "18:00",
      "location": "A definir"
    }
  ],
  "prerequisites": [],
  "n1": 8.0,
  "n2": 7.5,
  "n3": 9.0,
  "media_final": 8.75
}
```

### Semester
```json
{
  "code": "2024.1",
  "status": "Ativo"
}
```

### Enrollment
```json
{
  "2024.1": ["14203", "06507", "14044"],
  "2024.2": []
}
```

## 🔐 Validações

### Validações de Entrada
- Códigos de disciplina não vazios
- Períodos entre 1 e 9
- Carga horária > 0
- Dias da semana entre 1 e 5
- Horários em formato HH:MM válido

### Validações de Negócio
- Pré-requisitos devem estar concluídos (média ≥ 7.0)
- Não permitir conflitos de horários
- Notas entre 0 e 10
- Média UFRPE = (2 maiores notas) / 2

### Validações de CSV
- Headers obrigatórios presentes
- Dados obrigatórios preenchidos
- Tipos de dados corretos
- Valores dentro dos intervalos válidos

## 🚀 Performance

### Otimizações Implementadas
- Dados carregados uma única vez ao iniciar a aplicação
- Cálculos de média feitos apenas quando necessário
- Validações de conflito de horários otimizadas
- Debounce em funções de busca (se implementadas)

### Escalabilidade Futura
- Migrar JSON para banco de dados SQL
- Implementar cache com Redis
- Adicionar paginação para grandes listas
- Implementar busca full-text

## 🔗 Integração Frontend-Backend

### CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modificar em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Tratamento de Erros
Frontend:
```javascript
try {
    const data = await APIClient.get(endpoint);
} catch (error) {
    Notifications.error(error.message);
}
```

Backend:
```python
@router.get("/disciplines/{code}")
async def get_discipline(code: str):
    discipline = db.get_discipline(code)
    if not discipline:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return discipline
```

## 📈 Monitoramento e Logs

### Backend
- Logs de requisições HTTP
- Logs de erros com stack trace
- Logs de operações de banco de dados

### Frontend
- Console.log para debug
- Notificações visuais para o usuário
- Armazenamento de erros (localStorage)

## 🔄 Fluxo de Desenvolvimento

1. **Backend First**: Implementar lógica de negócio
2. **API Testing**: Testar endpoints com Swagger
3. **Frontend Integration**: Conectar frontend à API
4. **UI Testing**: Testar interface do usuário
5. **End-to-End**: Testar fluxos completos

## 📝 Convenções de Código

### Backend (Python)
- Snake_case para variáveis e funções
- PascalCase para classes
- Docstrings em português
- Type hints em todas as funções

### Frontend (JavaScript)
- camelCase para variáveis e funções
- PascalCase para classes
- Comentários em português
- Separação clara de responsabilidades

## 🚀 Deploy

### Backend (Produção)
```bash
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

### Frontend (Produção)
- Minificar CSS e JavaScript
- Otimizar imagens
- Usar CDN para assets estáticos
- Implementar service workers para offline

## 📚 Referências

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)
