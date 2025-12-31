/**
 * Módulo de Gerenciamento da Interface do Usuário - Portal Acadêmico UFRPE
 * Controla a navegação, renderização de componentes e interações.
 */

let currentSemester = '2024.1';

/**
 * Inicialização da aplicação
 */
async function initializeApp() {
    try {
        // Carregar dados iniciais no Dashboard
        await loadDashboard();

        // Configurar todos os ouvintes de eventos
        setupEventListeners();

        Notifications.success('Portal Acadêmico carregado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        Notifications.error('Erro ao carregar a aplicação');
    }
}

/**
 * Configurar ouvintes de eventos (Event Listeners)
 */
function setupEventListeners() {
    // Navegação por Abas (Tabs)
    document.querySelectorAll('.tab-button').forEach((button) => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Seletor de Semestres (Navegação dinâmica entre semestres)
    const semSelect = document.getElementById('semesterSelect');
    if (semSelect) {
        semSelect.value = currentSemester;
        semSelect.addEventListener('change', (e) => {
            currentSemester = e.target.value;
            // Atualiza o rótulo visual do semestre se existir
            const activeSemLabel = document.getElementById('activeSemester');
            if (activeSemLabel) activeSemLabel.textContent = currentSemester;
            
            // Recarrega a aba ativa para o novo semestre escolhido
            const activeTab = document.querySelector('.tab-button.active').dataset.tab;
            switchTab(activeTab);
            Notifications.success(`Semestre alterado para ${currentSemester}`);
        });
    }

    // Fechar Modais (Botão X)
    document.querySelectorAll('.modal-close').forEach((button) => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Fechar modal ao clicar fora do conteúdo branco
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

/**
 * Alternar entre abas e disparar o carregamento de dados
 */
function switchTab(tabName) {
    // Esconder todas as abas e desativar botões
    document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach((btn) => btn.classList.remove('active'));

    // Ativar aba e botão selecionados
    const tab = document.getElementById(tabName);
    if (tab) tab.classList.add('active');

    const button = document.querySelector(`[data-tab="${tabName}"]`);
    if (button) button.classList.add('active');

    // Carregar conteúdo específico da aba
    switch (tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'schedule': loadSchedule(); break;
        case 'flowchart': loadFlowchart(); break;
        case 'grades': loadGrades(); break;
        case 'admin': loadAdmin(); break;
    }
}

/**
 * Carregar Dashboard: Progresso, CR Ponderado e Disciplinas do Semestre
 */
async function loadDashboard() {
    try {
        const [progress, enrolledInSemester] = await Promise.all([
            EnrollmentsAPI.getProgress(),
            SemestersAPI.getEnrolled(currentSemester)
        ]);

        const enrolledIds = enrolledInSemester.map(d => d.code);

        // Atualizar barra de progresso (Integralização)
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = progress.percentage + '%';
            progressFill.textContent = Math.round(progress.percentage) + '%';
        }

        const hoursCompleted = document.getElementById('hoursCompleted');
        if (hoursCompleted) hoursCompleted.textContent = progress.completed_hours;

        const enrolledCount = document.getElementById('enrolledCount');
        if (enrolledCount) enrolledCount.textContent = enrolledInSemester.length;

        // Exibir CR (Média Geral Ponderada calculada no Backend)
        const generalAverage = document.getElementById('generalAverage');
        if (generalAverage) {
            generalAverage.textContent = progress.general_average 
                ? Utils.formatNumber(progress.general_average) 
                : '-';
        }

        // Renderizar disciplinas do semestre ativo no Dashboard
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
 * Criar card de disciplina com status visual (Verde, Amarelo, Azul ou Cinza)
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
 * Lógica de Status: Concluída, Cursando ou Disponível
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
 * Carregar Agenda Semanal Dinâmica (Baseada nos horários das disciplinas matriculadas)
 */
async function loadSchedule() {
    try {
        const schedule = await EnrollmentsAPI.getSchedule(currentSemester);
        const grid = document.getElementById('scheduleGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Cabeçalhos (Segunda a Sexta)
        ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'schedule-cell schedule-header';
            cell.textContent = day;
            grid.appendChild(cell);
        });

        // Identificar horários de início reais (ex: 08:00, 18:30)
        const allTimes = new Set();
        Object.values(schedule).forEach(dayClasses => {
            dayClasses.forEach(c => allTimes.add(c.start));
        });
        
        const sortedTimes = Array.from(allTimes).sort();

        sortedTimes.forEach(time => {
            // Célula da Hora (Lateral esquerda)
            const timeCell = document.createElement('div');
            timeCell.className = 'schedule-cell schedule-time';
            timeCell.textContent = time;
            grid.appendChild(timeCell);

            // Células de conteúdo para cada dia (1-5)
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
 * Carregar Fluxograma com cores de status dinâmicas
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
            levelDiv.innerHTML = `<h3>Nível ${period}</h3>`;

            byPeriod[period].forEach((disc) => {
                const status = getDisciplineStatus(disc, enrolledIds);
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
                    <div><p class="text-small text-muted">N1</p><p class="text-large"><strong>${disc.n1 ?? '-'}</strong></p></div>
                    <div><p class="text-small text-muted">N2</p><p class="text-large"><strong>${disc.n2 ?? '-'}</strong></p></div>
                    <div><p class="text-small text-muted">N3</p><p class="text-large"><strong>${disc.n3 ?? '-'}</strong></p></div>
                </div>`;

            if (disc.media_final !== null && disc.media_final !== undefined) {
                const statusClass = disc.media_final >= 7 ? 'success' : 'warning';
                gradesHTML += `<div class="mt-lg pt-md" style="border-top: 1px solid var(--border-light);">
                    <p class="text-small text-muted">Média Final</p>
                    <p class="text-large"><strong style="color: var(--${statusClass}-green);">${Utils.formatNumber(disc.media_final)}</strong></p>
                </div>`;
            }

            card.innerHTML = `
                <div class="card-header"><h3>${disc.name}</h3><p class="text-small text-muted">${disc.professor}</p></div>
                <div class="card-body">${gradesHTML}</div>
                <div class="card-footer"><button class="btn btn-primary btn-sm flex-1" onclick="openGradesModal('${disc.code}')">Editar Notas</button></div>`;
            container.appendChild(card);
        });
    } catch (error) { console.error('Erro ao carregar notas:', error); }
}

/**
 * Gerenciamento de Aproveitamento de Estudos (Equivalência)
 */
async function openCreditTransferModal() {
    const disciplines = await DisciplinesAPI.list();
    const select = document.getElementById('transferDisciplineCode');
    if (select) {
        // Mostrar apenas disciplinas que ainda não foram concluídas
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
    } catch (error) { Notifications.error('Erro ao registrar aproveitamento'); }
}

/**
 * Modais de Notas e Resultados UFRPE (Média 2 de 3)
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
    } catch (error) { Notifications.error('Erro ao abrir modal'); }
}

async function saveGrades() {
    try {
        const modal = document.getElementById('gradesModal');
        const code = modal.dataset.disciplineCode;
        const grades = {
            n1: parseFloat(document.getElementById('gradeN1').value),
            n2: parseFloat(document.getElementById('gradeN2').value),
            n3: parseFloat(document.getElementById('gradeN3').value)
        };

        if (isNaN(grades.n1) || isNaN(grades.n2) || isNaN(grades.n3)) {
            Notifications.error('Preencha as três notas');
            return;
        }

        const result = await DisciplinesAPI.setGrades(code, grades);
        const resultDiv = document.getElementById('gradesResult');
        resultDiv.textContent = `Média (2 de 3): ${Utils.formatNumber(result.average)}`;
        resultDiv.classList.remove('hidden');

        if (result.needs_final_exam) {
            const alertDiv = document.getElementById('finalExamAlert');
            alertDiv.innerHTML = `<strong>Atenção!</strong> Precisa de <strong>${Utils.formatNumber(result.final_exam_grade_needed)}</strong> na Prova Final.`;
            alertDiv.classList.remove('hidden');
        }

        Notifications.success('Notas salvas!');
        loadDashboard(); loadGrades();
    } catch (error) { Notifications.error('Erro ao salvar notas'); }
}

/**
 * Administração: Catálogo de Disciplinas (CRUD)
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
            </tr>`).join('');
    } catch (error) { Notifications.error('Erro ao carregar administração'); }
}

async function deleteDiscipline(code) {
    if (!confirm('Excluir esta disciplina?')) return;
    try {
        await DisciplinesAPI.delete(code);
        Notifications.success('Deletada!');
        loadAdmin();
    } catch (error) { Notifications.error('Erro ao deletar'); }
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
    } catch (error) { Notifications.error('Erro ao editar'); }
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
        Notifications.success('Atualizada!');
        closeModal('editDisciplineModal');
        loadAdmin();
    } catch (error) { Notifications.error('Erro ao salvar'); }
}

async function importCSV() {
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files[0]) return Notifications.error('Selecione um arquivo CSV');
    
    const result = await DisciplinesAPI.importCSV(fileInput.files[0]);
    if (result.success) {
        Notifications.success(`${result.imported_count} disciplinas importadas!`);
        loadAdmin();
    }
}

async function addDisciplineManually() {
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
    Notifications.success('Adicionada com sucesso!');
    loadAdmin();
}

/**
 * Funções Auxiliares para Modais
 */
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

/**
 * Inicializar quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', initializeApp);