"""
Modelos de dados (Pydantic) para a aplicação de Planejamento Acadêmico.
Define as estruturas de dados utilizadas na API.
"""

from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class SemesterStatus(str, Enum):
    """Status possíveis de um semestre."""
    ATIVO = "Ativo"
    PLANEJADO = "Planejado"
    ENCERRADO = "Encerrado"


class ScheduleItem(BaseModel):
    """Representa um horário de aula."""
    day: int  # 1=Segunda, 2=Terça, ..., 5=Sexta
    start: str  # Formato HH:MM
    end: str  # Formato HH:MM
    location: str


class DisciplineBase(BaseModel):
    """Modelo base para disciplinas."""
    code: str
    name: str
    professor: str
    period: int  # Nível (1-9)
    hours: int
    prerequisites: List[str] = []


class DisciplineCreate(DisciplineBase):
    """Modelo para criação de disciplina."""
    schedules: List[ScheduleItem] = []


class DisciplineUpdate(BaseModel):
    """Modelo para atualização de disciplina."""
    name: Optional[str] = None
    professor: Optional[str] = None
    period: Optional[int] = None
    hours: Optional[int] = None
    schedules: Optional[List[ScheduleItem]] = None
    prerequisites: Optional[List[str]] = None


class DisciplineGrades(BaseModel):
    """Modelo para notas de uma disciplina."""
    n1: Optional[float] = None
    n2: Optional[float] = None
    n3: Optional[float] = None


class Discipline(DisciplineBase):
    """Modelo completo de disciplina."""
    schedules: List[ScheduleItem] = []
    n1: Optional[float] = None
    n2: Optional[float] = None
    n3: Optional[float] = None
    media_final: Optional[float] = None

    class Config:
        from_attributes = True


class SemesterBase(BaseModel):
    """Modelo base para semestres."""
    code: str
    status: SemesterStatus


class SemesterCreate(SemesterBase):
    """Modelo para criação de semestre."""
    pass


class Semester(SemesterBase):
    """Modelo completo de semestre."""
    disciplines: List[str] = []  # IDs das disciplinas matriculadas

    class Config:
        from_attributes = True


class EnrollmentRequest(BaseModel):
    """Modelo para requisição de matrícula."""
    semester_code: str
    discipline_code: str


class GradesRequest(BaseModel):
    """Modelo para requisição de atualização de notas."""
    discipline_code: str
    n1: Optional[float] = None
    n2: Optional[float] = None
    n3: Optional[float] = None


class ScheduleConflictResponse(BaseModel):
    """Resposta de verificação de conflito de horários."""
    has_conflict: bool
    conflicting_discipline: Optional[str] = None
    message: str


class PrerequisiteCheckResponse(BaseModel):
    """Resposta de verificação de pré-requisitos."""
    prerequisites_met: bool
    missing_prerequisites: List[str] = []
    message: str


class EnrollmentResponse(BaseModel):
    """Resposta de matrícula."""
    success: bool
    message: str
    schedule_conflict: Optional[ScheduleConflictResponse] = None
    prerequisite_check: Optional[PrerequisiteCheckResponse] = None


class ProgressResponse(BaseModel):
    """Resposta com dados de progresso do curso."""
    total_hours: int
    completed_hours: int
    percentage: float
    enrolled_count: int
    general_average: Optional[float] = None


class FinalExamResponse(BaseModel):
    """Resposta do simulador de prova final."""
    average: float
    needs_final_exam: bool
    final_exam_grade_needed: Optional[float] = None
    message: str


class ImportCSVResponse(BaseModel):
    """Resposta de importação de CSV."""
    success: bool
    imported_count: int
    message: str
    errors: List[str] = []
