"""
Módulo de gerenciamento de dados.
Simula um banco de dados em memória com persistência em JSON.
"""

import json
import os
from typing import Dict, List, Optional
from app.models import Discipline, Semester, DisciplineCreate, SemesterCreate


class Database:
    """Gerenciador de dados da aplicação."""

    def __init__(self, data_dir: str = "data"):
        """
        Inicializa o banco de dados.

        Args:
            data_dir: Diretório para armazenar os arquivos de dados
        """
        self.data_dir = data_dir
        self.disciplines_file = os.path.join(data_dir, "disciplines.json")
        self.semesters_file = os.path.join(data_dir, "semesters.json")
        self.enrollments_file = os.path.join(data_dir, "enrollments.json")

        # Criar diretório se não existir
        os.makedirs(data_dir, exist_ok=True)

        # Dados em memória
        self.disciplines: Dict[str, Dict] = {}
        self.semesters: Dict[str, Dict] = {}
        self.enrollments: Dict[str, List[str]] = {}  # {semester_code: [discipline_codes]}

        # Carregar dados
        self._load_data()

        # Inicializar com dados de exemplo se vazio
        if not self.disciplines:
            self._initialize_default_data()

    def _load_data(self):
        """Carrega dados dos arquivos JSON."""
        if os.path.exists(self.disciplines_file):
            try:
                with open(self.disciplines_file, 'r', encoding='utf-8') as f:
                    self.disciplines = json.load(f)
            except Exception as e:
                print(f"Erro ao carregar disciplinas: {e}")

        if os.path.exists(self.semesters_file):
            try:
                with open(self.semesters_file, 'r', encoding='utf-8') as f:
                    self.semesters = json.load(f)
            except Exception as e:
                print(f"Erro ao carregar semestres: {e}")

        if os.path.exists(self.enrollments_file):
            try:
                with open(self.enrollments_file, 'r', encoding='utf-8') as f:
                    self.enrollments = json.load(f)
            except Exception as e:
                print(f"Erro ao carregar matrículas: {e}")

    def _save_data(self):
        """Salva dados nos arquivos JSON."""
        try:
            with open(self.disciplines_file, 'w', encoding='utf-8') as f:
                json.dump(self.disciplines, f, ensure_ascii=False, indent=2)

            with open(self.semesters_file, 'w', encoding='utf-8') as f:
                json.dump(self.semesters, f, ensure_ascii=False, indent=2)

            with open(self.enrollments_file, 'w', encoding='utf-8') as f:
                json.dump(self.enrollments, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Erro ao salvar dados: {e}")

    def _initialize_default_data(self):
        """Inicializa com dados de exemplo do curso CCP02."""
        # Disciplinas do 1º nível
        level1_disciplines = [
            {
                'code': '06418',
                'name': 'ÁLGEBRA VETORIAL E LINEAR PARA COMPUTAÇÃO',
                'professor': 'DM',
                'period': 1,
                'hours': 60,
                'schedules': [
                    {'day': 2, 'start': '16:00', 'end': '18:00', 'location': 'A definir'},
                    {'day': 4, 'start': '14:00', 'end': '16:00', 'location': 'A definir'}
                ],
                'prerequisites': []
            },
            {
                'code': '06507',
                'name': 'CÁLCULO NI',
                'professor': 'DM',
                'period': 1,
                'hours': 60,
                'schedules': [
                    {'day': 1, 'start': '16:00', 'end': '18:00', 'location': 'A definir'},
                    {'day': 3, 'start': '14:00', 'end': '16:00', 'location': 'A definir'}
                ],
                'prerequisites': []
            },
            {
                'code': '14044',
                'name': 'INTRODUÇÃO À CIÊNCIA DA COMPUTAÇÃO',
                'professor': 'Rafael Perazzo',
                'period': 1,
                'hours': 60,
                'schedules': [
                    {'day': 2, 'start': '14:00', 'end': '16:00', 'location': 'A definir'},
                    {'day': 5, 'start': '16:00', 'end': '18:00', 'location': 'A definir'}
                ],
                'prerequisites': []
            },
            {
                'code': '14117',
                'name': 'INTRODUÇÃO À PROGRAMAÇÃO I',
                'professor': 'Péricles Miranda',
                'period': 1,
                'hours': 60,
                'schedules': [
                    {'day': 1, 'start': '14:00', 'end': '16:00', 'location': 'A definir'},
                    {'day': 4, 'start': '16:00', 'end': '18:00', 'location': 'A definir'}
                ],
                'prerequisites': []
            },
            {
                'code': '14203',
                'name': 'MATEMÁTICA DISCRETA I',
                'professor': 'Pablo Sampaio',
                'period': 1,
                'hours': 60,
                'schedules': [
                    {'day': 3, 'start': '16:00', 'end': '18:00', 'location': 'A definir'},
                    {'day': 5, 'start': '14:00', 'end': '16:00', 'location': 'A definir'}
                ],
                'prerequisites': []
            }
        ]

        # Disciplinas do 2º nível
        level2_disciplines = [
            {
                'code': '06214',
                'name': 'ALGORITMOS',
                'professor': 'TBD',
                'period': 2,
                'hours': 60,
                'schedules': [
                    {'day': 2, 'start': '14:00', 'end': '16:00', 'location': 'A definir'},
                    {'day': 4, 'start': '16:00', 'end': '18:00', 'location': 'A definir'}
                ],
                'prerequisites': ['14117']
            },
            {
                'code': '06508',
                'name': 'CÁLCULO NII',
                'professor': 'DM',
                'period': 2,
                'hours': 60,
                'schedules': [
                    {'day': 1, 'start': '14:00', 'end': '16:00', 'location': 'A definir'},
                    {'day': 3, 'start': '16:00', 'end': '18:00', 'location': 'A definir'}
                ],
                'prerequisites': ['06507']
            },
            {
                'code': '14204',
                'name': 'MATEMÁTICA DISCRETA II',
                'professor': 'Maigan Steffane',
                'period': 2,
                'hours': 60,
                'schedules': [
                    {'day': 3, 'start': '16:00', 'end': '18:00', 'location': 'A definir'},
                    {'day': 5, 'start': '14:00', 'end': '16:00', 'location': 'A definir'}
                ],
                'prerequisites': ['14203']
            }
        ]

        # Adicionar disciplinas
        for disc in level1_disciplines + level2_disciplines:
            self.disciplines[disc['code']] = disc

        # Criar semestres
        self.semesters['2024.1'] = {
            'code': '2024.1',
            'status': 'Ativo'
        }
        self.semesters['2024.2'] = {
            'code': '2024.2',
            'status': 'Planejado'
        }

        # Inicializar matrículas
        self.enrollments['2024.1'] = []
        self.enrollments['2024.2'] = []

        self._save_data()

    # ============ DISCIPLINAS ============

    def get_discipline(self, code: str) -> Optional[Dict]:
        """Obtém uma disciplina pelo código."""
        return self.disciplines.get(code)

    def get_all_disciplines(self) -> List[Dict]:
        """Obtém todas as disciplinas."""
        return list(self.disciplines.values())

    def create_discipline(self, discipline: DisciplineCreate) -> Dict:
        """Cria uma nova disciplina."""
        disc_data = discipline.dict()
        self.disciplines[discipline.code] = disc_data
        self._save_data()
        return disc_data

    def update_discipline(self, code: str, updates: Dict) -> Optional[Dict]:
        """Atualiza uma disciplina."""
        if code not in self.disciplines:
            return None

        self.disciplines[code].update(updates)
        self._save_data()
        return self.disciplines[code]

    def delete_discipline(self, code: str) -> bool:
        """Deleta uma disciplina."""
        if code not in self.disciplines:
            return False

        del self.disciplines[code]

        # Remover de todas as matrículas
        for semester_code in self.enrollments:
            if code in self.enrollments[semester_code]:
                self.enrollments[semester_code].remove(code)

        self._save_data()
        return True

    def bulk_create_disciplines(self, disciplines: List[DisciplineCreate]) -> int:
        """Cria múltiplas disciplinas de uma vez."""
        count = 0
        for disc in disciplines:
            if disc.code not in self.disciplines:
                self.create_discipline(disc)
                count += 1

        return count

    # ============ SEMESTRES ============

    def get_semester(self, code: str) -> Optional[Dict]:
        """Obtém um semestre pelo código."""
        return self.semesters.get(code)

    def get_all_semesters(self) -> List[Dict]:
        """Obtém todos os semestres."""
        return list(self.semesters.values())

    def create_semester(self, semester: SemesterCreate) -> Dict:
        """Cria um novo semestre."""
        sem_data = semester.dict()
        self.semesters[semester.code] = sem_data
        self.enrollments[semester.code] = []
        self._save_data()
        return sem_data

    def update_semester(self, code: str, updates: Dict) -> Optional[Dict]:
        """Atualiza um semestre."""
        if code not in self.semesters:
            return None

        self.semesters[code].update(updates)
        self._save_data()
        return self.semesters[code]

    # ============ MATRÍCULAS ============

    def get_enrolled_disciplines(self, semester_code: str) -> List[Dict]:
        """Obtém as disciplinas matriculadas em um semestre."""
        if semester_code not in self.enrollments:
            return []

        discipline_codes = self.enrollments[semester_code]
        return [self.disciplines[code] for code in discipline_codes if code in self.disciplines]

    def enroll_discipline(self, semester_code: str, discipline_code: str) -> bool:
        """Matricula um aluno em uma disciplina."""
        if semester_code not in self.enrollments:
            return False

        if discipline_code not in self.disciplines:
            return False

        if discipline_code not in self.enrollments[semester_code]:
            self.enrollments[semester_code].append(discipline_code)
            self._save_data()
            return True

        return False

    def unenroll_discipline(self, semester_code: str, discipline_code: str) -> bool:
        """Remove matrícula de uma disciplina."""
        if semester_code not in self.enrollments:
            return False

        if discipline_code in self.enrollments[semester_code]:
            self.enrollments[semester_code].remove(discipline_code)
            self._save_data()
            return True

        return False

    # ============ NOTAS ============

    def set_grades(self, discipline_code: str, n1: float, n2: float, n3: float) -> bool:
        """Define as notas de uma disciplina."""
        if discipline_code not in self.disciplines:
            return False

        self.disciplines[discipline_code]['n1'] = n1
        self.disciplines[discipline_code]['n2'] = n2
        self.disciplines[discipline_code]['n3'] = n3

        self._save_data()
        return True

    def get_grades(self, discipline_code: str) -> Optional[Dict]:
        """Obtém as notas de uma disciplina."""
        if discipline_code not in self.disciplines:
            return None

        disc = self.disciplines[discipline_code]
        return {
            'n1': disc.get('n1'),
            'n2': disc.get('n2'),
            'n3': disc.get('n3'),
            'media_final': disc.get('media_final')
        }

    # ============ ESTATÍSTICAS ============

    def get_total_hours(self) -> int:
        """Obtém o total de horas do curso."""
        return sum(disc.get('hours', 0) for disc in self.disciplines.values())

    def get_completed_hours(self) -> int:
        """Obtém as horas de disciplinas concluídas (média >= 7.0)."""
        return sum(
            disc.get('hours', 0)
            for disc in self.disciplines.values()
            if disc.get('media_final') and disc.get('media_final') >= 7.0
        )

    def get_general_average(self) -> Optional[float]:
        """Obtém a média geral do aluno."""
        completed = [
            disc.get('media_final')
            for disc in self.disciplines.values()
            if disc.get('media_final') and disc.get('media_final') >= 7.0
        ]

        if not completed:
            return None

        return round(sum(completed) / len(completed), 2)
