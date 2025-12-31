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
            generalAverage.textContent = progress.general_average
                ? Utils.formatNumber(progress.general_average)
                : '-';
        }

        // Renderizar disciplinas matriculadas
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
 * Carregar Agenda Semanal
 */
async function loadSchedule() {
    try {
        const schedule = await EnrollmentsAPI.getSchedule(currentSemester);

        const grid = document.getElementById('scheduleGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Headers
        const days = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        days.forEach((day) => {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell schedule-header';
            cell.textContent = day;
            grid.appendChild(cell);
        });

        // Time slots
        const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        times.forEach((time) => {
            const timeCell = document.createElement('div');
            timeCell.className = 'schedule-cell schedule-time';
            timeCell.textContent = time;
            grid.appendChild(timeCell);

            for (let day = 1; day <= 5; day++) {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';

                const classesAtTime = schedule[day].filter((cls) => cls.start === time);

                if (classesAtTime.length > 0) {
                    const cls = classesAtTime[0];
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

        // Renderizar cada período
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
 * Carregar Administração
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
 * Salvar notas
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

        if (n1 < 0 || n1 > 10 || n2 < 0 || n2 > 10 || n3 < 0 || n3 > 10) {
            Notifications.error('As notas devem estar entre 0 e 10');
            return;
        }

        const result = await DisciplinesAPI.setGrades(disciplineCode, {
            n1,
            n2,
            n3,
        });

        // Mostrar resultado
        const resultDiv = document.getElementById('gradesResult');
        resultDiv.textContent = `Média Final (UFRPE): ${Utils.formatNumber(result.average)}`;
        resultDiv.classList.remove('hidden');

        // Mostrar alerta de prova final se necessário
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
 * Deletar disciplina
 */
async function deleteDiscipline(code) {
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) {
        return;
    }

    try {
        await DisciplinesAPI.delete(code);
        Notifications.success('Disciplina deletada com sucesso!');
        loadAdmin();
    } catch (error) {
        console.error('Erro ao deletar disciplina:', error);
        Notifications.error('Erro ao deletar disciplina');
    }
}

/**
 * Editar disciplina
 */
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
        console.error('Erro ao editar disciplina:', error);
        Notifications.error('Erro ao editar disciplina');
    }
}

/**
 * Salvar disciplina editada
 */
async function saveEditedDiscipline() {
    try {
        const modal = document.getElementById('editDisciplineModal');
        const code = modal.dataset.disciplineCode;

        const name = document.getElementById('editDisciplineName').value.trim();
        const professor = document.getElementById('editDisciplineProfessor').value.trim();
        const period = parseInt(document.getElementById('editDisciplinePeriod').value);
        const hours = parseInt(document.getElementById('editDisciplineHours').value);

        if (!name || !professor || !period || !hours) {
            Notifications.error('Preencha todos os campos');
            return;
        }

        await DisciplinesAPI.update(code, {
            name,
            professor,
            period,
            hours,
        });

        Notifications.success('Disciplina atualizada com sucesso!');
        closeModal('editDisciplineModal');
        loadAdmin();
    } catch (error) {
        console.error('Erro ao salvar disciplina:', error);
        Notifications.error('Erro ao salvar disciplina');
    }
}

/**
 * Importar CSV
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
            Notifications.success(`${result.imported_count} disciplinas importadas com sucesso!`);
            fileInput.value = '';
            loadAdmin();
        } else {
            Notifications.error(result.message);
            if (result.errors.length > 0) {
                console.error('Erros de importação:', result.errors);
            }
        }
    } catch (error) {
        console.error('Erro ao importar CSV:', error);
        Notifications.error('Erro ao importar CSV');
    }
}

/**
 * Adicionar disciplina manualmente
 */
async function addDisciplineManually() {
    try {
        const code = document.getElementById('disciplineCode').value.trim();
        const name = document.getElementById('disciplineName').value.trim();
        const professor = document.getElementById('disciplineProfessor').value.trim();
        const period = parseInt(document.getElementById('disciplinePeriod').value);
        const hours = parseInt(document.getElementById('disciplineHours').value);
        const prerequisites = document
            .getElementById('disciplinePrerequisites')
            .value.trim()
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p);

        if (!code || !name || !professor || !period || !hours) {
            Notifications.error('Preencha todos os campos obrigatórios');
            return;
        }

        await DisciplinesAPI.create({
            code,
            name,
            professor,
            period,
            hours,
            prerequisites,
            schedules: [],
        });

        Notifications.success('Disciplina adicionada com sucesso!');

        // Limpar formulário
        document.getElementById('disciplineCode').value = '';
        document.getElementById('disciplineName').value = '';
        document.getElementById('disciplineProfessor').value = '';
        document.getElementById('disciplinePeriod').value = '';
        document.getElementById('disciplineHours').value = '';
        document.getElementById('disciplinePrerequisites').value = '';

        loadAdmin();
    } catch (error) {
        console.error('Erro ao adicionar disciplina:', error);
        Notifications.error('Erro ao adicionar disciplina');
    }
}

/**
 * Abrir modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Fechar modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Inicializar quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', initializeApp);
