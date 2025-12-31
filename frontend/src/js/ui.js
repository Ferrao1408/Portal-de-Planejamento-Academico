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
    document.querySelectorAll('.tab-content').forEach((tab) => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach((btn) => {
        btn.classList.remove('active');
    });

    const tab = document.getElementById(tabName);
    if (tab) tab.classList.add('active');

    const button = document.querySelector(`[data-tab="${tabName}"]`);
    if (button) button.classList.add('active');

    switch (tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'schedule': loadSchedule(); break;
        case 'flowchart': loadFlowchart(); break;
        case 'grades': loadGrades(); break;
        case 'admin': loadAdmin(); break;
    }
}

/**
 * Carregar Dashboard
 */
async function loadDashboard() {
    try {
        const [disciplines, progress, enrolledInSemester] = await Promise.all([
            DisciplinesAPI.list(),
            EnrollmentsAPI.getProgress(),
            SemestersAPI.getEnrolled(currentSemester)
        ]);

        const enrolledIds = enrolledInSemester.map(d => d.code);

        // Atualizar progresso
        const percentage = progress.percentage;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
            progressFill.textContent = Math.round(percentage) + '%';
        }

        const hoursCompleted = document.getElementById('hoursCompleted');
        if (hoursCompleted) hoursCompleted.textContent = progress.completed_hours;

        const enrolledCount = document.getElementById('enrolledCount');
        if (enrolledCount) enrolledCount.textContent = enrolledInSemester.length;

        const generalAverage = document.getElementById('generalAverage');
        if (generalAverage) {
            generalAverage.textContent = progress.general_average
                ? Utils.formatNumber(progress.general_average)
                : '-';
        }

        // Renderizar disciplinas matriculadas
        const container = document.getElementById('dashboardDisciplines');
        if (container) {
            container.innerHTML = '';
            if (enrolledInSemester.length === 0) {
                container.innerHTML = '<p class="text-muted">Nenhuma disciplina matriculada neste semestre</p>';
            } else {
                enrolledInSemester.forEach((disc) => {
                    const card = createDisciplineCard(disc, enrolledIds);
                    container.appendChild(card);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

/**
 * Criar card de disciplina
 */
function createDisciplineCard(discipline, enrolledIds = []) {
    const card = document.createElement('div');
    const status = getDisciplineStatus(discipline, enrolledIds);
    card.className = `discipline-card ${status}`;

    let gradesHTML = '';
    if (discipline.media_final !== null && discipline.media_final !== undefined) {
        gradesHTML = `<p class="text-small mt-md"><strong>Média: ${Utils.formatNumber(discipline.media_final)}</strong></p>`;
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
            <button class="btn btn-sm btn-secondary btn-block mt-md" onclick="openGradesModal('${discipline.code}')">
                Editar Notas
            </button>
        </div>
    `;
    return card;
}

/**
 * Obter status da disciplina (Atualizado para incluir 'studying')
 */
function getDisciplineStatus(discipline, enrolledIds = []) {
    if (discipline.media_final !== undefined && discipline.media_final !== null && discipline.media_final >= 7) {
        return 'completed';
    }
    if (enrolledIds.includes(discipline.code)) {
        return 'studying';
    }
    return 'available';
}

function getStatusText(status) {
    const statusMap = {
        completed: 'Concluída',
        studying: 'Cursando',
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
        ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell schedule-header';
            cell.textContent = day;
            grid.appendChild(cell);
        });

        const allTimes = new Set();
        Object.values(schedule).forEach(dayClasses => {
            dayClasses.forEach(c => allTimes.add(c.start));
        });
        
        const sortedTimes = Array.from(allTimes).sort();

        sortedTimes.forEach(time => {
            const timeCell = document.createElement('div');
            timeCell.className = 'schedule-cell schedule-time';
            timeCell.textContent = time;
            grid.appendChild(timeCell);

            for (let day = 1; day <= 5; day++) {
                const cell = document.createElement('div');
                cell.className = 'schedule-cell';
                const cls = schedule[day].find(c => c.start === time);
                if (cls) {
                    cell.innerHTML = `
                        <div class="schedule-class">
                            <strong>${cls.discipline_name}</strong>
                            <p>${cls.start}-${cls.end}</p>
                        </div>`;
                }
                grid.appendChild(cell);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
    }
}

/**
 * Carregar Fluxograma
 */
async function loadFlowchart() {
    try {
        const [disciplines, enrolledInSemester] = await Promise.all([
            DisciplinesAPI.list(),
            SemestersAPI.getEnrolled(currentSemester)
        ]);
        const enrolledIds = enrolledInSemester.map(d => d.code);
        const container = document.getElementById('flowchartContainer');
        if (!container) return;

        container.innerHTML = '';
        const byPeriod = {};
        disciplines.forEach((disc) => {
            if (!byPeriod[disc.period]) byPeriod[disc.period] = [];
            byPeriod[disc.period].push(disc);
        });

        for (let period = 1; period <= 9; period++) {
            if (!byPeriod[period]) continue;
            const levelDiv = document.createElement('div');
            levelDiv.className = 'flowchart-level';
            const title = document.createElement('h3');
            title.textContent = `Nível ${period}`;
            levelDiv.appendChild(title);

            byPeriod[period].forEach((disc) => {
                const status = getDisciplineStatus(disc, enrolledIds);
                const discDiv = document.createElement('div');
                discDiv.className = `flowchart-discipline ${status}`;
                discDiv.textContent = disc.name;
                discDiv.onclick = () => showPrerequisites(disc);
                levelDiv.appendChild(discDiv);
            });
            container.appendChild(levelDiv);
        }
    } catch (error) {
        console.error('Erro ao carregar fluxograma:', error);
    }
}

function showPrerequisites(discipline) {
    if (!discipline.prerequisites || discipline.prerequisites.length === 0) {
        Notifications.info('Esta disciplina não possui pré-requisitos');
        return;
    }
    alert(`Pré-requisitos de ${discipline.name}:\n\n${discipline.prerequisites.join(', ')}`);
}

/**
 * Aproveitamento de Estudos
 */
async function openCreditTransferModal() {
    const disciplines = await DisciplinesAPI.list();
    const select = document.getElementById('transferDisciplineCode');
    if (select) {
        select.innerHTML = disciplines
            .filter(d => !(d.media_final >= 7))
            .map(d => `<option value="${d.code}">${d.code} - ${d.name}</option>`)
            .join('');
    }
    openModal('creditTransferModal');
}

async function saveCreditTransfer() {
    const code = document.getElementById('transferDisciplineCode').value;
    const grade = parseFloat(document.getElementById('transferGrade').value);
    if (grade < 7) {
        Notifications.error('Nota de aproveitamento deve ser no mínimo 7.0');
        return;
    }
    try {
        await DisciplinesAPI.setGrades(code, { n1: grade, n2: grade, n3: grade });
        Notifications.success('Aproveitamento registrado com sucesso!');
        closeModal('creditTransferModal');
        loadDashboard();
    } catch (error) {
        Notifications.error('Erro ao registrar aproveitamento');
    }
}

/**
 * Gerenciamento de Notas
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
        modal.dataset.disciplineCode = disciplineCode;

        document.getElementById('gradesResult').classList.add('hidden');
        document.getElementById('finalExamAlert').classList.add('hidden');
        openModal('gradesModal');
    } catch (error) {
        Notifications.error('Erro ao abrir modal');
    }
}

async function saveGrades() {
    try {
        const modal = document.getElementById('gradesModal');
        const disciplineCode = modal.dataset.disciplineCode;
        const grades = {
            n1: parseFloat(document.getElementById('gradeN1').value),
            n2: parseFloat(document.getElementById('gradeN2').value),
            n3: parseFloat(document.getElementById('gradeN3').value)
        };

        const result = await DisciplinesAPI.setGrades(disciplineCode, grades);
        const resultDiv = document.getElementById('gradesResult');
        resultDiv.textContent = `Média Final (UFRPE): ${Utils.formatNumber(result.average)}`;
        resultDiv.classList.remove('hidden');

        if (result.needs_final_exam) {
            const alertDiv = document.getElementById('finalExamAlert');
            alertDiv.innerHTML = `<strong>Atenção!</strong> Você precisa de <strong>${Utils.formatNumber(result.final_exam_grade_needed)}</strong> na final.`;
            alertDiv.classList.remove('hidden');
        }

        Notifications.success('Notas salvas!');
        loadDashboard();
        loadGrades();
    } catch (error) {
        Notifications.error('Erro ao salvar notas');
    }
}

/**
 * Administração e CRUD
 */
async function loadAdmin() {
    try {
        const disciplines = await DisciplinesAPI.list();
        const table = document.getElementById('catalogTable');
        if (!table) return;
        table.innerHTML = disciplines.map(disc => `
            <tr>
                <td>${disc.code}</td>
                <td>${disc.name}</td>
                <td>${disc.professor}</td>
                <td>${disc.period}</td>
                <td>${disc.hours}h</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editDiscipline('${disc.code}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDiscipline('${disc.code}')">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        Notifications.error('Erro ao carregar administração');
    }
}

async function importCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return Notifications.error('Selecione um arquivo CSV');
    const result = await DisciplinesAPI.importCSV(file);
    if (result.success) {
        Notifications.success(`${result.imported_count} disciplinas importadas!`);
        loadAdmin();
    } else Notifications.error(result.message);
}

// Funções de Modal
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.addEventListener('DOMContentLoaded', initializeApp);
