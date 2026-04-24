/* =================================================================
 * CENTRAL DE MAPEAMENTO DE PROCESSOS — Lógica do MVP
 * Funcionalidades:
 *  - Validação de campos obrigatórios
 *  - Geração de ID único por solicitação
 *  - Exibição de resumo, AS IS, TO BE e melhorias sugeridas
 *  - Histórico persistido em localStorage
 *  - Navegação entre abas do resultado
 * ================================================================= */

'use strict';

// ========== CONFIG ==========
const STORAGE_KEY = 'bpmn_lp_historico_v1';
const ID_COUNTER_KEY = 'bpmn_lp_id_counter_v1';

// ========== ELEMENTOS ==========
const form = document.getElementById('bpmn-form');
const feedback = document.getElementById('form-feedback');
const resultSection = document.getElementById('resultado');
const summaryList = document.getElementById('summary-list');
const improvementsList = document.getElementById('improvements-list');
const historyContainer = document.getElementById('history-container');
const btnNova = document.getElementById('btn-nova');
const btnImprimir = document.getElementById('btn-imprimir');
const btnLimparHist = document.getElementById('btn-limpar-historico');

// ========== CAMPOS ==========
const FIELDS = [
    { id: 'nomeProcesso',  label: 'Nome do processo',        required: true  },
    { id: 'objetivo',      label: 'Objetivo',                required: true  },
    { id: 'eventoInicio',  label: 'Evento de início',        required: true  },
    { id: 'eventoFim',     label: 'Evento de fim',           required: true  },
    { id: 'atores',        label: 'Atores envolvidos',       required: true  },
    { id: 'sistemas',      label: 'Sistemas utilizados',     required: false },
    { id: 'etapas',        label: 'Etapas principais',       required: true  },
    { id: 'decisoes',      label: 'Pontos de decisão',       required: false },
    { id: 'excecoes',      label: 'Exceções ou retrabalho',  required: false },
    { id: 'sla',           label: 'SLA ou prazo esperado',   required: false }
];

// ========== UTILITÁRIOS ==========
function getEl(id) { return document.getElementById(id); }

function gerarID() {
    const year = new Date().getFullYear();
    let counter = parseInt(localStorage.getItem(ID_COUNTER_KEY) || '0', 10);
    counter += 1;
    localStorage.setItem(ID_COUNTER_KEY, counter.toString());
    return `SOL-${year}-${counter.toString().padStart(4, '0')}`;
}

function formatarDataHora(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function scrollTo(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== VALIDAÇÃO ==========
function limparEstadoValidacao() {
    FIELDS.forEach(f => {
        const el = getEl(f.id);
        if (el) el.classList.remove('is-invalid');
    });
    feedback.className = 'form__feedback';
    feedback.textContent = '';
}

function validarFormulario() {
    limparEstadoValidacao();
    const erros = [];

    FIELDS.forEach(f => {
        const el = getEl(f.id);
        if (!el) return;
        const val = (el.value || '').trim();
        if (f.required && !val) {
            el.classList.add('is-invalid');
            erros.push(f.label);
        }
    });

    return erros;
}

// ========== COLETA DE DADOS ==========
function coletarDados() {
    const dados = {};
    FIELDS.forEach(f => {
        const el = getEl(f.id);
        dados[f.id] = el ? (el.value || '').trim() : '';
    });
    return dados;
}

// ========== MELHORIAS SUGERIDAS ==========
/**
 * Gera sugestões iniciais baseadas nos dados informados.
 * Lógica simples, orientada a heurísticas do que costuma aparecer
 * em processos com baixo nível de maturidade.
 */
function gerarSugestoes(dados) {
    const sugestoes = [];
    const sistemasLower = (dados.sistemas || '').toLowerCase();
    const etapasLower = (dados.etapas || '').toLowerCase();
    const excecoesLower = (dados.excecoes || '').toLowerCase();
    const slaLower = (dados.sla || '').toLowerCase();

    // SLA
    if (!dados.sla || slaLower.includes('não') || slaLower.includes('nao') || slaLower.includes('sem')) {
        sugestoes.push({
            titulo: 'Definir SLA formal por etapa',
            desc: 'Sem SLA definido, solicitações podem ficar em limbo. Estabeleça tempos-meta para cada transição crítica (ex: aprovação em 24h, elaboração em 48h).'
        });
    }

    // E-mail como canal principal
    if (sistemasLower.includes('e-mail') || sistemasLower.includes('email') || etapasLower.includes('e-mail') || etapasLower.includes('email')) {
        sugestoes.push({
            titulo: 'Substituir e-mail por formulário estruturado',
            desc: 'Comunicação por e-mail dificulta rastreabilidade. Centralize a entrada em um formulário com campos validados (Power Automate, Forms ou SharePoint).'
        });
    }

    // Retrabalho / exceções
    if (dados.excecoes && (excecoesLower.includes('ajuste') || excecoesLower.includes('retrabalho') || excecoesLower.includes('volta') || excecoesLower.includes('incomple'))) {
        sugestoes.push({
            titulo: 'Reduzir retrabalho com validação prévia',
            desc: 'Loops de retorno sinalizam falta de validação na origem. Inclua checklist/validações automáticas antes do envio para reduzir devoluções.'
        });
    }

    // Atores numerosos
    const numAtores = (dados.atores || '').split(',').filter(Boolean).length;
    if (numAtores >= 4) {
        sugestoes.push({
            titulo: 'Avaliar centralização em um orquestrador',
            desc: `Com ${numAtores} atores envolvidos, há risco de gargalo em intermediações manuais. Considere um sistema orquestrador (ex: Power Automate) para reduzir handoffs humanos.`
        });
    }

    // Nenhuma automação mencionada
    if (!sistemasLower.includes('power automate') && !sistemasLower.includes('rpa') && !sistemasLower.includes('automação') && !sistemasLower.includes('automacao')) {
        sugestoes.push({
            titulo: 'Identificar oportunidades de automação',
            desc: 'Nenhuma ferramenta de automação foi mencionada. Revise o fluxo para identificar etapas repetitivas candidatas a automação (notificações, registros, integrações).'
        });
    }

    // Sempre relevantes (governança)
    sugestoes.push({
        titulo: 'Centralizar documentos em repositório único',
        desc: 'Garanta que entregas, aprovações e versões finais estejam em um local único com ID vinculado à solicitação, permitindo auditoria e consulta posterior.'
    });

    sugestoes.push({
        titulo: 'Instrumentar métricas operacionais',
        desc: 'Defina indicadores (tempo médio, taxa de reprovação, gargalos por etapa) e monte um dashboard simples para acompanhar saúde do processo ao longo do tempo.'
    });

    return sugestoes;
}

// ========== RENDERIZAÇÃO ==========
function renderResumo(dados) {
    const campos = [
        { key: 'nomeProcesso',  label: 'Nome do processo'    },
        { key: 'objetivo',      label: 'Objetivo'            },
        { key: 'eventoInicio',  label: 'Evento de início'    },
        { key: 'eventoFim',     label: 'Evento de fim'       },
        { key: 'atores',        label: 'Atores envolvidos'   },
        { key: 'sistemas',      label: 'Sistemas'            },
        { key: 'etapas',        label: 'Etapas principais',  list: true },
        { key: 'decisoes',      label: 'Decisões'            },
        { key: 'excecoes',      label: 'Exceções'            },
        { key: 'sla',           label: 'SLA'                 }
    ];

    summaryList.innerHTML = campos.map(c => {
        const valor = dados[c.key] || '';
        const isEmpty = !valor;
        const classes = ['summary__value'];
        if (c.list) classes.push('summary__value--list');
        if (isEmpty) classes.push('summary__value--empty');

        const conteudo = isEmpty
            ? 'Não informado'
            : escapeHTML(valor);

        return `
            <div class="summary__item">
                <dt class="summary__label">${escapeHTML(c.label)}</dt>
                <dd class="${classes.join(' ')}">${conteudo}</dd>
            </div>
        `;
    }).join('');
}

function renderMelhorias(sugestoes) {
    improvementsList.innerHTML = sugestoes.map((s, i) => `
        <li class="improvement">
            <span class="improvement__icon">${i + 1}</span>
            <div class="improvement__content">
                <h5>${escapeHTML(s.titulo)}</h5>
                <p>${escapeHTML(s.desc)}</p>
            </div>
        </li>
    `).join('');
}

function renderResultado(registro) {
    // Cabeçalho
    getEl('result-id').textContent = registro.id;
    getEl('result-date').textContent = formatarDataHora(registro.dataISO);
    getEl('result-title').textContent = registro.dados.nomeProcesso || 'Solicitação de mapeamento';

    // Aba padrão
    ativarAba('resumo');

    // Conteúdos
    renderResumo(registro.dados);
    renderMelhorias(registro.sugestoes);

    // Exibe seção
    resultSection.hidden = false;
    setTimeout(() => scrollTo(resultSection), 120);
}

// ========== ABAS ==========
function ativarAba(nome) {
    document.querySelectorAll('.tab').forEach(t => {
        const isActive = t.dataset.tab === nome;
        t.classList.toggle('tab--active', isActive);
        t.setAttribute('aria-selected', String(isActive));
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
        const isActive = p.dataset.panel === nome;
        p.classList.toggle('tab-panel--active', isActive);
        p.hidden = !isActive;
    });
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => ativarAba(tab.dataset.tab));
});

// ========== HISTÓRICO ==========
function lerHistorico() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('Erro ao ler histórico:', e);
        return [];
    }
}

function salvarHistorico(lista) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch (e) {
        console.warn('Erro ao salvar histórico:', e);
    }
}

function adicionarAoHistorico(registro) {
    const lista = lerHistorico();
    lista.unshift(registro); // mais recente primeiro
    // Mantém apenas os últimos 20
    salvarHistorico(lista.slice(0, 20));
}

function renderHistorico() {
    const lista = lerHistorico();
    if (lista.length === 0) {
        historyContainer.innerHTML = `
            <p class="history__empty">
                Nenhuma solicitação registrada ainda. Envie o formulário acima para ver o histórico aqui.
            </p>
        `;
        return;
    }

    historyContainer.innerHTML = lista.map(r => {
        const titulo = r.dados.nomeProcesso || 'Sem nome';
        const obj = r.dados.objetivo || '';
        return `
            <article class="history-item" data-id="${escapeHTML(r.id)}">
                <div>
                    <span class="history-item__id">${escapeHTML(r.id)}</span>
                    <span class="history-item__date">${escapeHTML(formatarDataHora(r.dataISO))}</span>
                </div>
                <div>
                    <div class="history-item__title">${escapeHTML(titulo)}</div>
                    <span class="history-item__objective">${escapeHTML(obj)}</span>
                </div>
                <span class="history-item__status">Em fila</span>
                <button class="history-item__btn" data-action="ver" data-id="${escapeHTML(r.id)}">Ver resultado</button>
            </article>
        `;
    }).join('');

    // Vincula ação "Ver resultado"
    historyContainer.querySelectorAll('[data-action="ver"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const lista = lerHistorico();
            const registro = lista.find(r => r.id === id);
            if (registro) renderResultado(registro);
        });
    });
}

// ========== EVENTOS ==========

// Envio do formulário
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const erros = validarFormulario();

    if (erros.length > 0) {
        feedback.classList.add('is-error');
        feedback.textContent = `Por favor, preencha os campos obrigatórios: ${erros.join(', ')}.`;
        // Foco no primeiro inválido
        const primeiroInvalido = document.querySelector('.is-invalid');
        if (primeiroInvalido) primeiroInvalido.focus();
        return;
    }

    // Monta registro
    const dados = coletarDados();
    const registro = {
        id: gerarID(),
        dataISO: new Date().toISOString(),
        dados,
        sugestoes: gerarSugestoes(dados),
        status: 'Em fila para análise'
    };

    // Salva e renderiza
    adicionarAoHistorico(registro);
    renderResultado(registro);
    renderHistorico();

    // Feedback
    feedback.classList.remove('is-error');
    feedback.classList.add('is-success');
    feedback.textContent = `Solicitação ${registro.id} registrada com sucesso!`;

    // Mantém formulário preenchido por 2s, depois limpa
    setTimeout(() => {
        form.reset();
        limparEstadoValidacao();
    }, 2000);
});

// Limpar estado ao editar um campo inválido
FIELDS.forEach(f => {
    const el = getEl(f.id);
    if (!el) return;
    el.addEventListener('input', () => {
        if (el.classList.contains('is-invalid') && el.value.trim()) {
            el.classList.remove('is-invalid');
        }
    });
});

// Limpar formulário
form.addEventListener('reset', () => {
    limparEstadoValidacao();
});

// Nova solicitação
btnNova?.addEventListener('click', () => {
    resultSection.hidden = true;
    form.reset();
    limparEstadoValidacao();
    scrollTo(document.getElementById('solicitar'));
});

// Imprimir
btnImprimir?.addEventListener('click', () => {
    // Garante que todos os painéis apareçam no print
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.hidden = false;
    });
    window.print();
    // Restaura visibilidade após print
    setTimeout(() => {
        document.querySelectorAll('.tab-panel').forEach(p => {
            if (!p.classList.contains('tab-panel--active')) p.hidden = true;
        });
    }, 500);
});

// Limpar histórico
btnLimparHist?.addEventListener('click', () => {
    if (!confirm('Tem certeza que deseja apagar todo o histórico local?')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistorico();
});

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    renderHistorico();
});
