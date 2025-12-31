/**
 * Módulo de Gerenciamento da Interface do Usuário
 * Controla a navegação, renderização de componentes e interações
 */

let currentSemester = '2024.1';

/**
 * Inicialização da aplicação
 */
async function initializeApp() {
    try {
        // Carregar dados iniciais
        await loadDashboard();

        // Configurar event listeners
        setupEventListeners();

        Notifications.success('Aplicação carregada com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        Notifications.error('Erro ao carregar a aplicação');
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-button').forEach((button) => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Seletor de Semestres (Navegação dinâmica)
    const semSelect = document.getElementById('semesterSelect');
    if (semSelect) {
        semSelect.value = currentSemester;
        semSelect.addEventListener('change', (e) => {
            currentSemester = e.target.value;
            // Atualiza o texto visual do semestre se o elemento existir
            const activeSemLabel = document.getElementById('activeSemester');
            if (activeSemLabel) activeSemLabel.textContent = currentSemester;
            
            // Recarrega a aba ativa para o novo semestre escolhido
            const activeTab = document.querySelector('.tab-button.active').dataset.tab;
            switchTab(activeTab);
            Notifications.success(`Semestre alterado para ${currentSemester}`);
        });
    }

    // Modais
    document.querySelectorAll('.modal-close').forEach((button) => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

/**
 * Alternar entre abas
 */
function switchTab(tabName) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach((tab) => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach((btn) => {
        btn.classList.remove('active');
    });

    // Mostrar aba selecionada
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
    }

    // Marcar botão como ativo
    const button = document.querySelector(`[data-tab="${tabName}"]`);
    if (button) {
        button.classList.add('active');
    }

    // Carregar conteúdo da aba
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'schedule':
            loadSchedule();
            break;
        case 'flowchart':
            loadFlowchart();
            break;
        case 'grades':
            loadGrades();
            break;
        case 'admin':
            loadAdmin();
            break;
    }
}

/**
 * Carregar Dashboard
 */
async function loadDashboard() {
    try {
        const [disciplines, progress] = await Promise.all([
            DisciplinesAPI.list(),
            EnrollmentsAPI.getProgress(),
        ]);

        // Atualizar progresso
        const percentage = progress.percentage;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
            progressFill.textContent = Math.round(percentage) + '%';
        }

        const hoursCompleted = document.getElementById('hoursCompleted');
        if (hoursCompleted) {
            hoursCompleted.textContent = progress.completed_hours;
        }

        const enrolledCount = document.getElementById('enrolledCount');
        if (enrolledCount) {
            enrolledCount.textContent = progress.enrolled_count;
        }

        const generalAverage = document.getElementById('generalAverage');
        if (generalAverage) {
            // Exibe a média geral (agora calculada como CR ponderado no backend)
            generalAverage.textContent = progress.general_average
                ? Utils.formatNumber(progress.general_average)
                : '-';
        }

        // Renderizar disciplinas matriculadas no semestre ativo
        const enrolled = await SemestersAPI.getEnrolled(currentSemester);
        const container = document.getElementById('dashboardDisciplines');
        if (container) {
            container.innerHTML = '';

            if (enrolled.length === 0) {
                container.innerHTML =
                    '<p class="text-muted">Nenhuma disciplina matriculada neste semestre</p>';
            } else {
                enrolled.forEach((disc) => {
                    const card = createDisciplineCard(disc);
                    container.appendChild(card);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        Notifications.error('Erro ao carregar dashboard');
    }
}

/**
 * Criar card de disciplina
 */
function createDisciplineCard(discipline) {
    const card = document.createElement('div');
    const status = getDisciplineStatus(discipline);
    card.className = `discipline-card ${status}`;

    let gradesHTML = '';
    if (discipline.media_final !== null && discipline.media_final !== undefined) {
        gradesHTML = `<p class="text-small mt-md"><strong>Média: ${Utils.formatNumber(
            discipline.media_final
        )}</strong></p>`;
    }

    card.innerHTML = `
        <div class="discipline-card-content">
            <div class="discipline-card-header">
                <div>
                    <h3>${discipline.name}</h3>
                    <p class="text-small">${discipline.professor}</p>
                </div>
                <span class="badge badge-info">${getStatusText(status)}</span>
            </div>
            <p class="text-small">${discipline.hours}h</p>
            ${gradesHTML}
            <button class="btn btn-sm btn-secondary btn-block mt-md" onclick="openGradesModal('${
        discipline.code
    }')">
                Editar Notas
            </button>
        </div>
    `;

    return card;
}

/**
 * Obter status da disciplina
 */
function getDisciplineStatus(discipline) {
    if (
        discipline.media_final !== undefined &&
        discipline.media_final !== null &&
        discipline.media_final >= 7
    ) {
        return 'completed';
    }
    return 'available';
}

/**
 * Obter texto do status
 */
function getStatusText(status) {
    const statusMap = {
        completed: 'Concluída',
        available: 'Disponível',
        blocked: 'Bloqueada',
    };
    return statusMap[status] || status;
}

/**
 * Carregar Agenda Semanal (Refinada com horários dinâmicos)
 */
async function loadSchedule() {
    try {
        const schedule = await EnrollmentsAPI.getSchedule(currentSemester);
        const grid = document.getElementById('scheduleGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Headers (Seg-Sex)
        ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell schedule-header';
            cell.textContent = day;
            grid.appendChild(cell);
        });

        // Identificar todos os horários de início únicos das disciplinas matriculadas
        const allTimes = new Set();
        Object.values(schedule).forEach(dayClasses => {
            dayClasses.forEach(c => allTimes.add(c.start));
        });
        
        // Ordenar os horários para criar as linhas da agenda
        const sortedTimes = Array.from(allTimes).sort();

        sortedTimes.forEach(time => {
            // Célula do Horário
            const timeCell = document.createElement('div');
            timeCell.className = 'schedule-cell schedule-time';
            timeCell.textContent = time;
            grid.appendChild(timeCell);

            // Células para cada dia da semana
            for (let day = 1; day <= 5; day++) {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';

                const cls = schedule[day].find(c => c.start === time);

                if (cls) {
                    const classDiv = document.createElement('div');
                    classDiv.className = 'schedule-class';
                    classDiv.innerHTML = `
                        <strong>${cls.discipline_name}</strong>
                        <p>${cls.start}-${cls.end}</p>
                    `;
                    cell.appendChild(classDiv);
                }
                grid.appendChild(cell);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        Notifications.error('Erro ao carregar agenda');
    }
}

/**
 * Carregar Fluxograma
 */
async function loadFlowchart() {
    try {
        const disciplines = await DisciplinesAPI.list();
        const container = document.getElementById('flowchartContainer');
        if (!container) return;

        container.innerHTML = '';

        // Agrupar por período
        const byPeriod = {};
        disciplines.forEach((disc) => {
            if (!byPeriod[disc.period]) byPeriod[disc.period] = [];
            byPeriod[disc.period].push(disc);
        });

        // Renderizar cada período (Nível 1 ao 9)
        for (let period = 1; period <= 9; period++) {
            if (!byPeriod[period]) continue;

            const levelDiv = document.createElement('div');
            levelDiv.className = 'flowchart-level';

            const title = document.createElement('h3');
            title.textContent = `Nível ${period}`;
            levelDiv.appendChild(title);

            byPeriod[period].forEach((disc) => {
                const status = getDisciplineStatus(disc);
                const discDiv = document.createElement('div');
                discDiv.className = `flowchart-discipline ${status}`;
                discDiv.textContent = disc.name;
                discDiv.style.cursor = 'pointer';
                discDiv.onclick = () => showPrerequisites(disc);
                levelDiv.appendChild(discDiv);
            });

            container.appendChild(levelDiv);
        }
    } catch (error) {
        console.error('Erro ao carregar fluxograma:', error);
        Notifications.error('Erro ao carregar fluxograma');
    }
}

/**
 * Mostrar pré-requisitos
 */
function showPrerequisites(discipline) {
    if (!discipline.prerequisites || discipline.prerequisites.length === 0) {
        Notifications.info('Esta disciplina não possui pré-requisitos');
        return;
    }

    const prereqText = discipline.prerequisites.join(', ');
    alert(`Pré-requisitos de ${discipline.name}:\n\n${prereqText}`);
}

/**
 * Carregar Painel de Notas
 */
async function loadGrades() {
    try {
        const disciplines = await DisciplinesAPI.list();
        const container = document.getElementById('gradesPanel');
        if (!container) return;

        container.innerHTML = '';

        disciplines.forEach((disc) => {
            const card = document.createElement('div');
            card.className = 'card';

            let gradesHTML = `
                <div class="grid grid-cols-3 gap-md">
                    <div>
                        <p class="text-small text-muted">N1</p>
                        <p class="text-large"><strong>${
                            disc.n1 !== undefined ? Utils.formatNumber(disc.n1) : '-'
                        }</strong></p>
                    </div>
                    <div>
                        <p class="text-small text-muted">N2</p>
                        <p class="text-large"><strong>${
                            disc.n2 !== undefined ? Utils.formatNumber(disc.n2) : '-'
                        }</strong></p>
                    </div>
                    <div>
                        <p class="text-small text-muted">N3</p>
                        <p class="text-large"><strong>${
                            disc.n3 !== undefined ? Utils.formatNumber(disc.n3) : '-'
                        }</strong></p>
                    </div>
                </div>
            `;

            if (disc.media_final !== undefined && disc.media_final !== null) {
                const statusClass = disc.media_final >= 7 ? 'success' : 'warning';
                gradesHTML += `
                    <div class="mt-lg pt-md" style="border-top: 1px solid var(--border-light);">
                        <p class="text-small text-muted">Média Final</p>
                        <p class="text-large"><strong style="color: var(--${statusClass}-green);">${Utils.formatNumber(
                    disc.media_final
                )}</strong></p>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="card-header">
                    <h3>${disc.name}</h3>
                    <p class="text-small text-muted">${disc.professor}</p>
                </div>
                <div class="card-body">
                    ${gradesHTML}
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary btn-sm flex-1" onclick="openGradesModal('${disc.code}')">
                        Editar Notas
                    </button>
                </div>
            `;

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        Notifications.error('Erro ao carregar notas');
    }
}

/**
 * Carregar Administração (Catálogo)
 */
async function loadAdmin() {
    try {
        const disciplines = await DisciplinesAPI.list();
        const table = document.getElementById('catalogTable');
        if (!table) return;

        table.innerHTML = '';

        disciplines.forEach((disc) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${disc.code}</td>
                <td>${disc.name}</td>
                <td>${disc.professor}</td>
                <td>${disc.period}</td>
                <td>${disc.hours}h</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editDiscipline('${disc.code}')">
                        Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDiscipline('${disc.code}')">
                        Excluir
                    </button>
                </td>
            `;
            table.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar admin:', error);
        Notifications.error('Erro ao carregar administração');
    }
}

/**
 * Abrir modal de notas
 */
async function openGradesModal(disciplineCode) {
    try {
        const disc = await DisciplinesAPI.get(disciplineCode);

        const modal = document.getElementById('gradesModal');
        if (!modal) return;

        document.getElementById('gradesModalTitle').textContent = `Notas - ${disc.name}`;
        document.getElementById('gradeN1').value = disc.n1 || '';
        document.getElementById('gradeN2').value = disc.n2 || '';
        document.getElementById('gradeN3').value = disc.n3 || '';

        // Armazenar o código para uso posterior
        modal.dataset.disciplineCode = disciplineCode;

        // Limpar resultados anteriores
        document.getElementById('gradesResult').classList.add('hidden');
        document.getElementById('finalExamAlert').classList.add('hidden');

        openModal('gradesModal');
    } catch (error) {
        console.error('Erro ao abrir modal de notas:', error);
        Notifications.error('Erro ao abrir modal');
    }
}

/**
 * Salvar notas e exibir resultados UFRPE
 */
async function saveGrades() {
    try {
        const modal = document.getElementById('gradesModal');
        const disciplineCode = modal.dataset.disciplineCode;

        const n1 = parseFloat(document.getElementById('gradeN1').value);
        const n2 = parseFloat(document.getElementById('gradeN2').value);
        const n3 = parseFloat(document.getElementById('gradeN3').value);

        if (isNaN(n1) || isNaN(n2) || isNaN(n3)) {
            Notifications.error('Preencha todas as três notas');
            return;
        }

        const result = await DisciplinesAPI.setGrades(disciplineCode, { n1, n2, n3 });

        // Mostrar resultado da média 2 de 3
        const resultDiv = document.getElementById('gradesResult');
        resultDiv.textContent = `Média Final (UFRPE): ${Utils.formatNumber(result.average)}`;
        resultDiv.classList.remove('hidden');

        // Mostrar alerta de prova final se necessário (simulador)
        if (result.needs_final_exam) {
            const alertDiv = document.getElementById('finalExamAlert');
            alertDiv.innerHTML = `<strong>Atenção!</strong> Você precisa de <strong>${Utils.formatNumber(
                result.final_exam_grade_needed
            )}</strong> na prova final para ser aprovado.`;
            alertDiv.classList.remove('hidden');
        }

        Notifications.success('Notas salvas com sucesso!');
        loadDashboard();
        loadGrades();
    } catch (error) {
        console.error('Erro ao salvar notas:', error);
        Notifications.error('Erro ao salvar notas');
    }
}

/**
 * Operações CRUD de Administração
 */
async function deleteDiscipline(code) {
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return;
    try {
        await DisciplinesAPI.delete(code);
        Notifications.success('Disciplina deletada com sucesso!');
        loadAdmin();
    } catch (error) {
        Notifications.error('Erro ao deletar disciplina');
    }
}

async function editDiscipline(code) {
    try {
        const disc = await DisciplinesAPI.get(code);
        document.getElementById('editDisciplineCode').value = disc.code;
        document.getElementById('editDisciplineName').value = disc.name;
        document.getElementById('editDisciplineProfessor').value = disc.professor;
        document.getElementById('editDisciplinePeriod').value = disc.period;
        document.getElementById('editDisciplineHours').value = disc.hours;

        const modal = document.getElementById('editDisciplineModal');
        modal.dataset.disciplineCode = code;
        openModal('editDisciplineModal');
    } catch (error) {
        Notifications.error('Erro ao editar disciplina');
    }
}

async function saveEditedDiscipline() {
    try {
        const modal = document.getElementById('editDisciplineModal');
        const code = modal.dataset.disciplineCode;
        const data = {
            name: document.getElementById('editDisciplineName').value.trim(),
            professor: document.getElementById('editDisciplineProfessor').value.trim(),
            period: parseInt(document.getElementById('editDisciplinePeriod').value),
            hours: parseInt(document.getElementById('editDisciplineHours').value)
        };
        await DisciplinesAPI.update(code, data);
        Notifications.success('Disciplina atualizada!');
        closeModal('editDisciplineModal');
        loadAdmin();
    } catch (error) {
        Notifications.error('Erro ao salvar alterações');
    }
}

/**
 * Importar Catálogo via CSV
 */
async function importCSV() {
    try {
        const fileInput = document.getElementById('csvFile');
        const file = fileInput.files[0];
        if (!file) {
            Notifications.error('Selecione um arquivo CSV');
            return;
        }
        const result = await DisciplinesAPI.importCSV(file);
        if (result.success) {
            Notifications.success(`${result.imported_count} disciplinas importadas!`);
            fileInput.value = '';
            loadAdmin();
        } else {
            Notifications.error(result.message);
        }
    } catch (error) {
        Notifications.error('Erro ao importar CSV');
    }
}

async function addDisciplineManually() {
    try {
        const data = {
            code: document.getElementById('disciplineCode').value.trim(),
            name: document.getElementById('disciplineName').value.trim(),
            professor: document.getElementById('disciplineProfessor').value.trim(),
            period: parseInt(document.getElementById('disciplinePeriod').value),
            hours: parseInt(document.getElementById('disciplineHours').value),
            prerequisites: document.getElementById('disciplinePrerequisites').value.split(',').map(p => p.trim()).filter(p => p),
            schedules: []
        };
        await DisciplinesAPI.create(data);
        Notifications.success('Disciplina adicionada!');
        loadAdmin();
    } catch (error) {
        Notifications.error('Erro ao adicionar disciplina');
    }
}

/**
 * Funções auxiliares de Modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

/**
 * Inicializar quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', initializeApp);