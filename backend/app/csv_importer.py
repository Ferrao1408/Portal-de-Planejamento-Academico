"""
Módulo de importação de CSV.
Responsável por parsear e validar arquivos CSV de disciplinas.
"""

import csv
import io
from typing import List, Dict, Tuple
from app.models import DisciplineCreate, ScheduleItem
from app.business_logic import DataValidation


class CSVImporter:
    """Classe responsável pela importação de arquivos CSV."""

    # Formato esperado do CSV
    EXPECTED_HEADERS = [
        'Código', 'Nome', 'Professor', 'Período', 'Local', 
        'Dia', 'Início', 'Fim', 'Pré-requisitos'
    ]

    @staticmethod
    def parse_csv(file_content: str) -> Tuple[List[Dict], List[str]]:
        """
        Faz o parsing de um arquivo CSV.

        Args:
            file_content: Conteúdo do arquivo CSV como string

        Returns:
            Tuple[List[Dict], List[str]]: (disciplinas_agrupadas, erros)
        """
        errors = []
        disciplines_map = {}

        try:
            # Usar StringIO para simular um arquivo
            csv_file = io.StringIO(file_content)
            reader = csv.DictReader(csv_file, delimiter=';')

            if not reader.fieldnames:
                errors.append("Arquivo CSV vazio ou inválido")
                return [], errors

            # Validar headers
            expected_headers = set(CSVImporter.EXPECTED_HEADERS)
            actual_headers = set(reader.fieldnames) if reader.fieldnames else set()

            if not expected_headers.issubset(actual_headers):
                missing = expected_headers - actual_headers
                errors.append(f"Headers faltando: {', '.join(missing)}")
                return [], errors

            # Processar linhas
            for row_num, row in enumerate(reader, start=2):  # Começa em 2 (header é 1)
                try:
                    # Validar e limpar dados
                    code = row.get('Código', '').strip()
                    name = row.get('Nome', '').strip()
                    professor = row.get('Professor', '').strip()
                    period_str = row.get('Período', '').strip()
                    location = row.get('Local', '').strip()
                    day_str = row.get('Dia', '').strip()
                    start_time = row.get('Início', '').strip()
                    end_time = row.get('Fim', '').strip()
                    prerequisites_str = row.get('Pré-requisitos', '').strip()

                    # Validações básicas
                    if not code:
                        errors.append(f"Linha {row_num}: Código vazio")
                        continue

                    if not name:
                        errors.append(f"Linha {row_num}: Nome vazio")
                        continue

                    if not professor:
                        errors.append(f"Linha {row_num}: Professor vazio")
                        continue

                    # Converter e validar período
                    try:
                        period = int(period_str)
                        if not DataValidation.validate_period(period):
                            errors.append(f"Linha {row_num}: Período {period} inválido (deve ser 1-9)")
                            continue
                    except ValueError:
                        errors.append(f"Linha {row_num}: Período '{period_str}' não é um número")
                        continue

                    # Converter e validar dia
                    try:
                        day = int(day_str)
                        if not DataValidation.validate_day_of_week(day):
                            errors.append(f"Linha {row_num}: Dia {day} inválido (deve ser 1-5)")
                            continue
                    except ValueError:
                        errors.append(f"Linha {row_num}: Dia '{day_str}' não é um número")
                        continue

                    # Validar formato de horário
                    if not CSVImporter._validate_time_format(start_time):
                        errors.append(f"Linha {row_num}: Horário de início '{start_time}' inválido (use HH:MM)")
                        continue

                    if not CSVImporter._validate_time_format(end_time):
                        errors.append(f"Linha {row_num}: Horário de término '{end_time}' inválido (use HH:MM)")
                        continue

                    # Parsear pré-requisitos
                    prerequisites = []
                    if prerequisites_str:
                        prerequisites = [p.strip() for p in prerequisites_str.split(',') if p.strip()]

                    # Agrupar por código (mesma disciplina pode ter múltiplos horários)
                    if code not in disciplines_map:
                        disciplines_map[code] = {
                            'code': code,
                            'name': name,
                            'professor': professor,
                            'period': period,
                            'hours': 60,  # Padrão
                            'schedules': [],
                            'prerequisites': prerequisites
                        }

                    # Adicionar horário
                    schedule = {
                        'day': day,
                        'start': start_time,
                        'end': end_time,
                        'location': location
                    }
                    disciplines_map[code]['schedules'].append(schedule)

                except Exception as e:
                    errors.append(f"Linha {row_num}: Erro ao processar - {str(e)}")
                    continue

        except Exception as e:
            errors.append(f"Erro ao ler arquivo CSV: {str(e)}")
            return [], errors

        # Converter para lista
        disciplines = list(disciplines_map.values())

        return disciplines, errors

    @staticmethod
    def _validate_time_format(time_str: str) -> bool:
        """
        Valida se uma string está no formato HH:MM.

        Args:
            time_str: String de horário

        Returns:
            bool: True se válido, False caso contrário
        """
        if not time_str or ':' not in time_str:
            return False

        try:
            parts = time_str.split(':')
            if len(parts) != 2:
                return False

            hours, minutes = int(parts[0]), int(parts[1])
            return 0 <= hours < 24 and 0 <= minutes < 60
        except (ValueError, AttributeError):
            return False

    @staticmethod
    def import_from_file(file_content: str) -> Tuple[List[DisciplineCreate], List[str]]:
        """
        Importa disciplinas de um arquivo CSV.

        Args:
            file_content: Conteúdo do arquivo CSV

        Returns:
            Tuple[List[DisciplineCreate], List[str]]: (disciplinas, erros)
        """
        disciplines_data, errors = CSVImporter.parse_csv(file_content)

        # Converter para DisciplineCreate
        disciplines = []
        for disc_data in disciplines_data:
            try:
                schedules = [
                    ScheduleItem(
                        day=sch['day'],
                        start=sch['start'],
                        end=sch['end'],
                        location=sch['location']
                    )
                    for sch in disc_data.get('schedules', [])
                ]

                discipline = DisciplineCreate(
                    code=disc_data['code'],
                    name=disc_data['name'],
                    professor=disc_data['professor'],
                    period=disc_data['period'],
                    hours=disc_data.get('hours', 60),
                    prerequisites=disc_data.get('prerequisites', []),
                    schedules=schedules
                )
                disciplines.append(discipline)
            except Exception as e:
                errors.append(f"Erro ao converter disciplina {disc_data.get('code')}: {str(e)}")

        return disciplines, errors

    @staticmethod
    def validate_csv_format(file_content: str) -> Tuple[bool, List[str]]:
        """
        Valida o formato de um arquivo CSV sem fazer o parsing completo.

        Args:
            file_content: Conteúdo do arquivo CSV

        Returns:
            Tuple[bool, List[str]]: (válido, erros)
        """
        errors = []

        try:
            csv_file = io.StringIO(file_content)
            reader = csv.DictReader(csv_file, delimiter=';')

            if not reader.fieldnames:
                errors.append("Arquivo CSV vazio")
                return False, errors

            expected_headers = set(CSVImporter.EXPECTED_HEADERS)
            actual_headers = set(reader.fieldnames)

            if not expected_headers.issubset(actual_headers):
                missing = expected_headers - actual_headers
                errors.append(f"Headers faltando: {', '.join(missing)}")
                return False, errors

            # Verificar se há pelo menos uma linha de dados
            if not any(reader):
                errors.append("Arquivo CSV não contém dados")
                return False, errors

        except Exception as e:
            errors.append(f"Erro ao validar arquivo: {str(e)}")
            return False, errors

        return True, errors
