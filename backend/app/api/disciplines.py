"""
Rotas da API para gerenciamento de disciplinas.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from app.models import (
    Discipline, DisciplineCreate, DisciplineUpdate, DisciplineGrades,
    ImportCSVResponse, GradesRequest, FinalExamResponse
)
from app.database import Database
from app.csv_importer import CSVImporter
from app.business_logic import (
    AcademicCalculations, ScheduleValidation, PrerequisiteValidation
)

router = APIRouter(prefix="/api/disciplines", tags=["disciplines"])
db = Database()


@router.get("", response_model=List[Discipline])
async def list_disciplines():
    """Lista todas as disciplinas."""
    return db.get_all_disciplines()


@router.get("/{code}", response_model=Discipline)
async def get_discipline(code: str):
    """Obtém uma disciplina específica."""
    discipline = db.get_discipline(code)
    if not discipline:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")
    return discipline


@router.post("", response_model=Discipline)
async def create_discipline(discipline: DisciplineCreate):
    """Cria uma nova disciplina."""
    # Verificar se já existe
    if db.get_discipline(discipline.code):
        raise HTTPException(status_code=400, detail="Disciplina já existe")

    # Validar dados
    valid, errors = discipline_validation(
        discipline.code, discipline.name, discipline.professor,
        discipline.period, discipline.hours
    )
    if not valid:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    return db.create_discipline(discipline)


@router.put("/{code}", response_model=Discipline)
async def update_discipline(code: str, updates: DisciplineUpdate):
    """Atualiza uma disciplina."""
    discipline = db.get_discipline(code)
    if not discipline:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    update_data = updates.dict(exclude_unset=True)
    updated = db.update_discipline(code, update_data)
    return updated


@router.delete("/{code}")
async def delete_discipline(code: str):
    """Deleta uma disciplina."""
    if not db.delete_discipline(code):
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    return {"message": "Disciplina deletada com sucesso"}


@router.post("/import/csv", response_model=ImportCSVResponse)
async def import_csv(file: UploadFile = File(...)):
    """Importa disciplinas de um arquivo CSV."""
    try:
        content = await file.read()
        file_content = content.decode('utf-8')

        # Validar formato
        valid, validation_errors = CSVImporter.validate_csv_format(file_content)
        if not valid:
            return ImportCSVResponse(
                success=False,
                imported_count=0,
                message="Formato de CSV inválido",
                errors=validation_errors
            )

        # Fazer o import
        disciplines, import_errors = CSVImporter.import_from_file(file_content)

        # Criar as disciplinas
        count = 0
        for disc in disciplines:
            try:
                if not db.get_discipline(disc.code):
                    db.create_discipline(disc)
                    count += 1
            except Exception as e:
                import_errors.append(f"Erro ao criar disciplina {disc.code}: {str(e)}")

        return ImportCSVResponse(
            success=True,
            imported_count=count,
            message=f"{count} disciplinas importadas com sucesso",
            errors=import_errors
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar arquivo: {str(e)}")


@router.post("/{code}/grades", response_model=FinalExamResponse)
async def set_grades(code: str, grades: GradesRequest):
    """Define as notas de uma disciplina e calcula a média."""
    discipline = db.get_discipline(code)
    if not discipline:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    # Validar notas
    if grades.n1 is None or grades.n2 is None or grades.n3 is None:
        raise HTTPException(status_code=400, detail="Todas as três notas são obrigatórias")

    try:
        # Calcular média UFRPE
        average = AcademicCalculations.calculate_ufrpe_average(
            grades.n1, grades.n2, grades.n3
        )

        # Salvar notas
        db.set_grades(code, grades.n1, grades.n2, grades.n3)

        # Atualizar média final
        db.update_discipline(code, {'media_final': average})

        # Verificar se precisa fazer prova final
        final_exam_grade = AcademicCalculations.calculate_final_exam_grade(average)

        message = ""
        if average >= 7.0:
            message = "Aprovado!"
        elif final_exam_grade is not None:
            message = f"Você precisa de {final_exam_grade} na prova final"
        else:
            message = "Reprovado"

        return FinalExamResponse(
            average=average,
            needs_final_exam=final_exam_grade is not None,
            final_exam_grade_needed=final_exam_grade,
            message=message
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{code}/grades", response_model=DisciplineGrades)
async def get_grades(code: str):
    """Obtém as notas de uma disciplina."""
    grades = db.get_grades(code)
    if grades is None:
        raise HTTPException(status_code=404, detail="Disciplina não encontrada")

    return DisciplineGrades(**grades)


def discipline_validation(code: str, name: str, professor: str, period: int, hours: int):
    """Valida os dados de uma disciplina."""
    from app.business_logic import DataValidation
    return DataValidation.validate_discipline_data(code, name, professor, period, hours)
