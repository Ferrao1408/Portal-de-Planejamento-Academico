"""
Lógica de negócio para cálculos acadêmicos.
Implementa as regras específicas da UFRPE e validações.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime


class AcademicCalculations:
    """Classe responsável pelos cálculos acadêmicos."""

    @staticmethod
    def calculate_ufrpe_average(n1: float, n2: float, n3: float) -> float:
        """
        Calcula a média final conforme regra UFRPE.
        A média é a média das duas maiores notas entre N1, N2 e N3.
        """
        notes = [n1, n2, n3]
        
        # Validar intervalo
        for note in notes:
            if not (0 <= note <= 10):
                raise ValueError(f"Nota {note} fora do intervalo 0-10")
        
        # Ordenar em ordem decrescente e pegar as duas maiores
        notes.sort(reverse=True)
        average = (notes[0] + notes[1]) / 2
        
        return round(average, 2)

    @staticmethod
    def calculate_weighted_cr(disciplines_list: List[dict]) -> Optional[float]:
        """
        Calcula o CR ponderado pela carga horária.
        Fórmula: Σ(Nota * CH) / Σ(CH total)
        """
        total_weighted_points = 0
        total_hours = 0
        
        for disc in disciplines_list:
            media = disc.get('media_final')
            ch = disc.get('hours', 60) # Padrão 60h se não informado
            
            if media is not None:
                total_weighted_points += (media * ch)
                total_hours += ch
                
        if total_hours == 0:
            return None
            
        return round(total_weighted_points / total_hours, 2)

    @staticmethod
    def calculate_final_exam_grade(average: float) -> Optional[float]:
        """
        Calcula a nota necessária na prova final.
        Aplicável quando: média >= 3.0 e < 7.0
        """
        if not (0 <= average <= 10):
            raise ValueError(f"Média {average} fora do intervalo 0-10")
        
        # Se média >= 7.0, já passou. Se média < 3.0, reprova direto.
        if average >= 7.0 or average < 3.0:
            return None
        
        # Se 3.0 <= média < 7.0, precisa fazer final (Nota necessária = 10 - média)
        final_grade_needed = 10 - average
        return round(final_grade_needed, 2)

    @staticmethod
    def calculate_course_progress(completed_hours: int, total_hours: int = 3210) -> float:
        """
        Calcula o percentual de progresso do curso.
        Total de 3210h conforme estrutura CCP02 da UFRPE.
        """
        if total_hours <= 0:
            raise ValueError("Total de horas deve ser maior que 0")
        
        if completed_hours < 0:
            completed_hours = 0
        
        if completed_hours > total_hours:
            completed_hours = total_hours
        
        percentage = (completed_hours / total_hours) * 100
        return round(percentage, 2)

    @staticmethod
    def calculate_general_average(discipline_averages: List[float]) -> Optional[float]:
        """Calcula a média aritmética simples das disciplinas."""
        if not discipline_averages:
            return None
        
        for avg in discipline_averages:
            if not (0 <= avg <= 10):
                raise ValueError(f"Média {avg} fora do intervalo 0-10")
        
        general_average = sum(discipline_averages) / len(discipline_averages)
        return round(general_average, 2)


class ScheduleValidation:
    """Classe responsável pela validação de horários."""

    @staticmethod
    def time_to_minutes(time_str: str) -> int:
        """Converte uma string de horário (HH:MM) para minutos."""
        try:
            hours, minutes = map(int, time_str.split(':'))
            if not (0 <= hours < 24 and 0 <= minutes < 60):
                raise ValueError(f"Horário inválido: {time_str}")
            return hours * 60 + minutes
        except (ValueError, AttributeError):
            raise ValueError(f"Formato de horário inválido: {time_str}. Use HH:MM")

    @staticmethod
    def check_time_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
        """Verifica se dois períodos de tempo se sobrepõem."""
        start1_min = ScheduleValidation.time_to_minutes(start1)
        end1_min = ScheduleValidation.time_to_minutes(end1)
        start2_min = ScheduleValidation.time_to_minutes(start2)
        end2_min = ScheduleValidation.time_to_minutes(end2)
        
        return start1_min < end2_min and end1_min > start2_min

    @staticmethod
    def has_schedule_conflict(discipline1_schedules: List[Dict], 
                             discipline2_schedules: List[Dict]) -> Tuple[bool, Optional[Dict]]:
        """Verifica se há conflito de horários entre duas disciplinas."""
        for sch1 in discipline1_schedules:
            for sch2 in discipline2_schedules:
                if sch1.get('day') == sch2.get('day'):
                    if ScheduleValidation.check_time_overlap(
                        sch1.get('start'), sch1.get('end'),
                        sch2.get('start'), sch2.get('end')
                    ):
                        return True, {
                            'day': sch1.get('day'),
                            'time1': f"{sch1.get('start')}-{sch1.get('end')}",
                            'time2': f"{sch2.get('start')}-{sch2.get('end')}"
                        }
        return False, None


class PrerequisiteValidation:
    """Classe responsável pela validação de pré-requisitos."""

    @staticmethod
    def check_prerequisites(discipline_prerequisites: List[str],
                           completed_disciplines: Dict[str, float]) -> Tuple[bool, List[str]]:
        """Verifica se todos os pré-requisitos foram atendidos (média >= 7.0)."""
        missing = []
        for prereq_id in discipline_prerequisites:
            if prereq_id not in completed_disciplines or completed_disciplines[prereq_id] < 7.0:
                missing.append(prereq_id)
        return len(missing) == 0, missing

    @staticmethod
    def validate_discipline_status(discipline_id: str,
                                  discipline_prerequisites: List[str],
                                  completed_disciplines: Dict[str, float],
                                  enrolled_ids: List[str] = []) -> str:
        """
        Determina o status de uma disciplina: 'completed', 'studying', 'available', 'blocked'.
        """
        # 1. Verificar se já foi concluída (incluindo Aproveitamento)
        if discipline_id in completed_disciplines and completed_disciplines[discipline_id] >= 7.0:
            return 'completed'
        
        # 2. Verificar se está sendo cursada no semestre atual
        if discipline_id in enrolled_ids:
            return 'studying'
        
        # 3. Verificar pré-requisitos
        all_met, _ = PrerequisiteValidation.check_prerequisites(
            discipline_prerequisites, completed_disciplines
        )
        
        return 'available' if all_met else 'blocked'


class DataValidation:
    """Classe responsável pela validação geral de dados."""

    @staticmethod
    def validate_discipline_code(code: str) -> bool:
        return bool(code and isinstance(code, str) and len(code.strip()) > 0)

    @staticmethod
    def validate_period(period: int) -> bool:
        return isinstance(period, int) and 1 <= period <= 9

    @staticmethod
    def validate_hours(hours: int) -> bool:
        return isinstance(hours, int) and hours > 0

    @staticmethod
    def validate_discipline_data(code: str, name: str, professor: str, 
                                period: int, hours: int) -> Tuple[bool, List[str]]:
        errors = []
        if not DataValidation.validate_discipline_code(code):
            errors.append("Código de disciplina inválido")
        if not name or not isinstance(name, str):
            errors.append("Nome da disciplina inválido")
        if not professor or not isinstance(professor, str):
            errors.append("Nome do professor inválido")
        if not DataValidation.validate_period(period):
            errors.append("Período deve estar entre 1 e 9")
        if not DataValidation.validate_hours(hours):
            errors.append("Carga horária deve ser maior que 0")
        
        return len(errors) == 0, errors