"""
Rotas da API para gerenciamento de matrículas e semestres.
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.models import (
    Semester, SemesterCreate, EnrollmentRequest, EnrollmentResponse,
    ScheduleConflictResponse, PrerequisiteCheckResponse, ProgressResponse
)
from app.database import Database
from app.business_logic import (
    ScheduleValidation, PrerequisiteValidation, AcademicCalculations
)

router = APIRouter(prefix="/api", tags=["enrollments"])
db = Database()


# ============ SEMESTRES ============

@router.get("/semesters", response_model=List[Semester])
async def list_semesters():
    """Lista todos os semestres."""
    semesters = db.get_all_semesters()
    result = []
    for sem in semesters:
        sem['disciplines'] = db.enrollments.get(sem['code'], [])
        result.append(sem)
    return result


@router.get("/semesters/{code}", response_model=Semester)
async def get_semester(code: str):
    """Obtém um semestre específico."""
    semester = db.get_semester(code)
    if not semester:
        raise HTTPException(status_code=404, detail="Semestre não encontrado")

    semester['disciplines'] = db.enrollments.get(code, [])
    return semester


@router.post("/semesters", response_model=Semester)
async def create_semester(semester: SemesterCreate):
    """Cria um novo semestre."""
    if db.get_semester(semester.code):
        raise HTTPException(status_code=400, detail="Semestre já existe")

    return db.create_semester(semester)


# ============ MATRÍCULAS ============

@router.post("/enroll", response_model=EnrollmentResponse)
async def enroll_discipline(request: EnrollmentRequest):
    """Matricula um aluno em uma disciplina."""
    # Verificar se o semestre existe
    semester = db.get_semester(request.semester_code)
    if not semester:
        raise HTTPException(status_code=404, detail="Semestre não encontrado")

    # Verificar se a disciplina existe
    discipline = db.get_discipline(request.discipline_code)
    if not discipline:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    # Verificar pré-requisitos
    completed_disciplines = {}
    for disc in db.get_all_disciplines():
        if disc.get('media_final') and disc.get('media_final') >= 7.0:
            completed_disciplines[disc['code']] = disc['media_final']

    prereq_met, missing = PrerequisiteValidation.check_prerequisites(
        discipline.get('prerequisites', []),
        completed_disciplines
    )

    if not prereq_met:
        missing_names = [db.get_discipline(code)['name'] for code in missing if db.get_discipline(code)]
        return EnrollmentResponse(
            success=False,
            message="Pré-requisitos não atendidos",
            prerequisite_check=PrerequisiteCheckResponse(
                prerequisites_met=False,
                missing_prerequisites=missing_names,
                message=f"Disciplinas faltando: {', '.join(missing_names)}"
            )
        )

    # Verificar conflitos de horários
    enrolled_disciplines = db.get_enrolled_disciplines(request.semester_code)
    for enrolled_disc in enrolled_disciplines:
        has_conflict, conflict_info = ScheduleValidation.has_schedule_conflict(
            discipline.get('schedules', []),
            enrolled_disc.get('schedules', [])
        )

        if has_conflict:
            return EnrollmentResponse(
                success=False,
                message="Conflito de horário detectado",
                schedule_conflict=ScheduleConflictResponse(
                    has_conflict=True,
                    conflicting_discipline=enrolled_disc['name'],
                    message=f"Conflito com {enrolled_disc['name']}"
                )
            )

    # Fazer a matrícula
    if db.enroll_discipline(request.semester_code, request.discipline_code):
        return EnrollmentResponse(
            success=True,
            message="Disciplina matriculada com sucesso"
        )
    else:
        return EnrollmentResponse(
            success=False,
            message="Disciplina já matriculada"
        )


@router.post("/unenroll", response_model=EnrollmentResponse)
async def unenroll_discipline(request: EnrollmentRequest):
    """Remove matrícula de uma disciplina."""
    if db.unenroll_discipline(request.semester_code, request.discipline_code):
        return EnrollmentResponse(
            success=True,
            message="Matrícula removida com sucesso"
        )
    else:
        return EnrollmentResponse(
            success=False,
            message="Disciplina não estava matriculada"
        )


@router.get("/semesters/{code}/enrolled", response_model=List[dict])
async def get_enrolled_disciplines(code: str):
    """Obtém as disciplinas matriculadas em um semestre."""
    semester = db.get_semester(code)
    if not semester:
        raise HTTPException(status_code=404, detail="Semestre não encontrado")

    return db.get_enrolled_disciplines(code)


# ============ PROGRESSO ============

@router.get("/progress", response_model=ProgressResponse)
async def get_progress():
    """Obtém o progresso geral do curso."""
    total_hours = 3210  # Total do curso CCP02
    completed_hours = db.get_completed_hours()
    enrolled_count = len(db.enrollments.get('2024.1', []))
    general_average = db.get_general_average()

    percentage = AcademicCalculations.calculate_course_progress(
        completed_hours, total_hours
    )

    return ProgressResponse(
        total_hours=total_hours,
        completed_hours=completed_hours,
        percentage=percentage,
        enrolled_count=enrolled_count,
        general_average=general_average
    )


@router.get("/schedule/{semester_code}")
async def get_schedule(semester_code: str):
    """Obtém o cronograma de aulas de um semestre."""
    semester = db.get_semester(semester_code)
    if not semester:
        raise HTTPException(status_code=404, detail="Semestre não encontrado")

    enrolled = db.get_enrolled_disciplines(semester_code)

    # Organizar por dia da semana
    schedule = {day: [] for day in range(1, 6)}

    for discipline in enrolled:
        for schedule_item in discipline.get('schedules', []):
            day = schedule_item['day']
            schedule[day].append({
                'discipline_code': discipline['code'],
                'discipline_name': discipline['name'],
                'start': schedule_item['start'],
                'end': schedule_item['end'],
                'location': schedule_item['location']
            })

    # Ordenar por horário
    for day in schedule:
        schedule[day].sort(key=lambda x: x['start'])

    return schedule
