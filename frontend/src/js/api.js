/**
 * Módulo de Configuração da API
 * Gerencia todas as requisições HTTP para o backend
 */

const API_BASE_URL = 'http://localhost:8000/api';

class APIClient {
    /**
     * Faz uma requisição HTTP genérica
     */
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
        };

        try {
            const response = await fetch(url, finalOptions);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erro na requisição ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * GET - Obtém dados
     */
    static get(endpoint) {
        return this.request(endpoint, {
            method: 'GET',
        });
    }

    /**
     * POST - Cria dados
     */
    static post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT - Atualiza dados
     */
    static put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE - Deleta dados
     */
    static delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    }

    /**
     * POST com FormData (para upload de arquivos)
     */
    static postFormData(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            headers: {},
            body: formData,
        });
    }
}

/**
 * Endpoints de Disciplinas
 */
const DisciplinesAPI = {
    list: () => APIClient.get('/disciplines'),
    get: (code) => APIClient.get(`/disciplines/${code}`),
    create: (data) => APIClient.post('/disciplines', data),
    update: (code, data) => APIClient.put(`/disciplines/${code}`, data),
    delete: (code) => APIClient.delete(`/disciplines/${code}`),
    importCSV: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return APIClient.postFormData('/disciplines/import/csv', formData);
    },
    setGrades: (code, grades) => APIClient.post(`/disciplines/${code}/grades`, grades),
    getGrades: (code) => APIClient.get(`/disciplines/${code}/grades`),
};

/**
 * Endpoints de Semestres
 */
const SemestersAPI = {
    list: () => APIClient.get('/semesters'),
    get: (code) => APIClient.get(`/semesters/${code}`),
    create: (data) => APIClient.post('/semesters', data),
    getEnrolled: (code) => APIClient.get(`/semesters/${code}/enrolled`),
};

/**
 * Endpoints de Matrículas
 */
const EnrollmentsAPI = {
    enroll: (semesterCode, disciplineCode) =>
        APIClient.post('/enroll', {
            semester_code: semesterCode,
            discipline_code: disciplineCode,
        }),
    unenroll: (semesterCode, disciplineCode) =>
        APIClient.post('/unenroll', {
            semester_code: semesterCode,
            discipline_code: disciplineCode,
        }),
    getProgress: () => APIClient.get('/progress'),
    getSchedule: (semesterCode) => APIClient.get(`/schedule/${semesterCode}`),
};

/**
 * Tratamento de Erros
 */
class APIError extends Error {
    constructor(message, status = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

/**
 * Notificações
 */
const Notifications = {
    show: (message, type = 'info', duration = 3000) => {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.textContent = message;

        const container = document.getElementById('notifications');
        if (container) {
            container.appendChild(notification);

            if (duration > 0) {
                setTimeout(() => {
                    notification.remove();
                }, duration);
            }
        }
    },

    success: (message) => Notifications.show(message, 'success'),
    error: (message) => Notifications.show(message, 'danger', 5000),
    warning: (message) => Notifications.show(message, 'warning'),
    info: (message) => Notifications.show(message, 'info'),
};

/**
 * Utilitários
 */
const Utils = {
    /**
     * Formata um número como moeda
     */
    formatCurrency: (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    },

    /**
     * Formata uma data
     */
    formatDate: (date) => {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    },

    /**
     * Formata um número com 2 casas decimais
     */
    formatNumber: (value, decimals = 2) => {
        return parseFloat(value).toFixed(decimals);
    },

    /**
     * Obtém o nome do dia da semana
     */
    getDayName: (day) => {
        const days = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        return days[day] || '';
    },

    /**
     * Valida email
     */
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Debounce para funções
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle para funções
     */
    throttle: (func, limit) => {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },
};
