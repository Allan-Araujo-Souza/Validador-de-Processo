'use strict';

const STORAGE_KEY = 'bpmn_lp_historico_v1';
const ID_COUNTER_KEY = 'bpmn_lp_id_counter_v1';
const ANALYST_SESSION_KEY = 'bpmn_analista_sessao';
const ANALYST_PASSWORD = 'analista2026';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
    { id: 'sla',           label: 'SLA ou prazo esperado',   required: false },
    { id: 'solicitante',   label: 'Solicitante',             required: false }
];

let currentDetailId = null;

// ==================== UTILITÁRIOS ====================
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function gerarID() {
    const year = new Date().getFullYear();
    let counter = parseInt(localStorage.getItem(ID_COUNTER_KEY) || '0', 10);
    counter += 1;
    localStorage.setItem(ID_COUNTER_KEY, counter.toString());
    return `SOL-${year}-${counter.toString().padStart(4, '0')}`;
}

function formatarDataHora(iso) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatarTamanho(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function scrollTo(el) {
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==================== STORAGE ====================
function lerHistorico() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function salvarHistorico(lista) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
    catch (e) { console.warn('Erro ao salvar histórico:', e); }
}

function adicionarAoHistorico(registro) {
    const lista = lerHistorico();
    lista.unshift(registro);
    salvarHistorico(lista.slice(0, 50)); // até 50 para o analista ter mais visibilidade
}

function atualizarRegistro(id, atualizacoes) {
    const lista = lerHistorico();
    const idx = lista.findIndex(r => r.id === id);
    if (idx === -1) return null;
    lista[idx] = { ...lista[idx], ...atualizacoes, updatedAt: new Date().toISOString() };
    salvarHistorico(lista);
    return lista[idx];
}

function buscarRegistro(id) {
    return lerHistorico().find(r => r.id === id);
}

// ==================== VALIDAÇÃO FORMULÁRIO ====================
function limparEstadoValidacao() {
    FIELDS.forEach(f => {
        const el = $(f.id);
        if (el) el.classList.remove('is-invalid');
    });
    const fb = $('form-feedback');
    if (fb) { fb.className = 'form__feedback'; fb.textContent = ''; }
}

function validarFormulario() {
    limparEstadoValidacao();
    const erros = [];
    FIELDS.forEach(f => {
        const el = $(f.id);
        if (!el) return;
        const val = (el.value || '').trim();
        if (f.required && !val) {
            el.classList.add('is-invalid');
            erros.push(f.label);
        }
    });
    return erros;
}

function coletarDados() {
    const dados = {};
    FIELDS.forEach(f => {
        const el = $(f.id);
        dados[f.id] = el ? (el.value || '').trim() : '';
    });
    return dados;
}

// ==================== SUGESTÕES HEURÍSTICAS ====================
function gerarSugestoes(dados) {
    const sugestoes = [];
    const sistemas = (dados.sistemas || '').toLowerCase();
    const etapas = (dados.etapas || '').toLowerCase();
    const excecoes = (dados.excecoes || '').toLowerCase();
    const sla = (dados.sla || '').toLowerCase();

    if (!dados.sla || sla.includes('não') || sla.includes('nao') || sla.includes('sem')) {
        sugestoes.push({
            titulo: 'Definir SLA formal por etapa',
            desc: 'Sem SLA definido, solicitações podem ficar em limbo. Estabeleça tempos-meta para cada transição crítica (ex: aprovação em 24h, elaboração em 48h).'
        });
    }

    if (sistemas.includes('e-mail') || sistemas.includes('email') || etapas.includes('e-mail') || etapas.includes('email')) {
        sugestoes.push({
            titulo: 'Substituir e-mail por formulário estruturado',
            desc: 'Comunicação por e-mail dificulta rastreabilidade. Centralize a entrada em um formulário com campos validados (Power Automate, Forms ou SharePoint).'
        });
    }

    if (dados.excecoes && (excecoes.includes('ajuste') || excecoes.includes('retrabalho') || excecoes.includes('volta') || excecoes.includes('incomple'))) {
        sugestoes.push({
            titulo: 'Reduzir retrabalho com validação prévia',
            desc: 'Loops de retorno sinalizam falta de validação na origem. Inclua checklist/validações automáticas antes do envio para reduzir devoluções.'
        });
    }

    const numAtores = (dados.atores || '').split(',').filter(Boolean).length;
    if (numAtores >= 4) {
        sugestoes.push({
            titulo: 'Avaliar centralização em um orquestrador',
            desc: `Com ${numAtores} atores envolvidos, há risco de gargalo em intermediações manuais. Considere um sistema orquestrador (ex: Power Automate) para reduzir handoffs humanos.`
        });
    }

    if (!sistemas.includes('power automate') && !sistemas.includes('rpa') && !sistemas.includes('automação') && !sistemas.includes('automacao')) {
        sugestoes.push({
            titulo: 'Identificar oportunidades de automação',
            desc: 'Nenhuma ferramenta de automação foi mencionada. Revise o fluxo para identificar etapas repetitivas candidatas a automação (notificações, registros, integrações).'
        });
    }

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

// ==================== RENDERIZAÇÃO VISÃO USUÁRIO ====================
function renderResumo(dados, container) {
    const alvo = container || $('summary-list');
    const campos = [
        { key: 'nomeProcesso',  label: 'Nome do processo' },
        { key: 'objetivo',      label: 'Objetivo' },
        { key: 'eventoInicio',  label: 'Evento de início' },
        { key: 'eventoFim',     label: 'Evento de fim' },
        { key: 'atores',        label: 'Atores envolvidos' },
        { key: 'sistemas',      label: 'Sistemas' },
        { key: 'etapas',        label: 'Etapas principais', list: true },
        { key: 'decisoes',      label: 'Decisões' },
        { key: 'excecoes',      label: 'Exceções' },
        { key: 'sla',           label: 'SLA' },
        { key: 'solicitante',   label: 'Solicitante' }
    ];
    alvo.innerHTML = campos.map(c => {
        const valor = dados[c.key] || '';
        const isEmpty = !valor;
        const classes = ['summary__value'];
        if (c.list) classes.push('summary__value--list');
        if (isEmpty) classes.push('summary__value--empty');
        const conteudo = isEmpty ? 'Não informado' : escapeHTML(valor);
        return `<div class="summary__item">
            <dt class="summary__label">${escapeHTML(c.label)}</dt>
            <dd class="${classes.join(' ')}">${conteudo}</dd>
        </div>`;
    }).join('');
}

function renderMelhorias(sugestoes) {
    const alvo = $('improvements-list');
    if (!alvo || !sugestoes) return;
    alvo.innerHTML = sugestoes.map((s, i) => `
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
    $('result-id').textContent = registro.id;
    $('result-date').textContent = formatarDataHora(registro.dataISO);
    $('result-title').textContent = registro.dados.nomeProcesso || 'Solicitação de mapeamento';

    // Status dinâmico
    const statusEl = $('result-status');
    const status = registro.status || 'Em fila para análise';
    statusEl.innerHTML = `<span class="result-header__status-dot"></span> ${status === 'Concluído' ? '✓ Concluído' : 'Recebido · ' + status}`;
    if (status === 'Concluído') {
        statusEl.querySelector('.result-header__status-dot').style.background = 'var(--success)';
        statusEl.querySelector('.result-header__status-dot').style.boxShadow = '0 0 0 3px rgba(47, 107, 58, 0.15)';
    }

    ativarAba('resumo');
    renderResumo(registro.dados);
    renderMelhorias(registro.sugestoes);

    // Se concluída, renderiza arquivos nas abas AS IS / TO BE
    renderArquivosNasAbas(registro);

    $('resultado').hidden = false;
    setTimeout(() => scrollTo($('resultado')), 120);
}

function renderArquivosNasAbas(registro) {
    const arquivos = registro.arquivos || [];
    const asIs = arquivos.filter(a => /as[_-]?is|asis/i.test(a.name));
    const toBe = arquivos.filter(a => /to[_-]?be|tobe/i.test(a.name));
    const outros = arquivos.filter(a => !/as[_-]?is|asis|to[_-]?be|tobe/i.test(a.name));

    const panelAsIs = $('panel-as-is-content');
    const panelToBe = $('panel-to-be-content');

    if (registro.status === 'Concluído' && arquivos.length > 0) {
        if (asIs.length > 0 || outros.length > 0) {
            panelAsIs.innerHTML = `
                <h4 class="panel__title">BPMN AS IS — arquivos</h4>
                <p class="panel__desc">Arquivos gerados pelo analista. Clique para baixar.</p>
                ${renderListaArquivos(asIs.length > 0 ? asIs : outros)}
                ${registro.resumoFinal ? `<div style="margin-top:20px;padding:16px;background:var(--paper);border:1px solid var(--line);border-radius:8px;"><strong>Resumo:</strong><br>${escapeHTML(registro.resumoFinal).replace(/\n/g, '<br>')}</div>` : ''}
            `;
        }
        if (toBe.length > 0) {
            panelToBe.innerHTML = `
                <h4 class="panel__title">BPMN TO BE — arquivos</h4>
                <p class="panel__desc">Proposta otimizada. Clique nos arquivos para baixar.</p>
                ${renderListaArquivos(toBe)}
            `;
        }
    }
}

function renderListaArquivos(arquivos) {
    if (!arquivos || arquivos.length === 0) return '<p class="panel__desc">Sem arquivos.</p>';
    return `<ul class="file-list">${arquivos.map(a => `
        <li class="file-item">
            <span class="file-item__icon">${extIcon(a.name)}</span>
            <span class="file-item__name">${escapeHTML(a.name)}</span>
            <span class="file-item__size">${formatarTamanho(a.size)}</span>
            <a href="${a.dataUrl}" download="${escapeHTML(a.name)}" class="btn btn--ghost btn--small" style="text-decoration:none;">Baixar</a>
        </li>
    `).join('')}</ul>`;
}

function extIcon(nome) {
    const ext = (nome.split('.').pop() || '').toLowerCase();
    return ext.toUpperCase().substring(0, 4);
}

function ativarAba(nome) {
    $$('.tab').forEach(t => {
        const ativo = t.dataset.tab === nome;
        t.classList.toggle('tab--active', ativo);
        t.setAttribute('aria-selected', String(ativo));
    });
    $$('.tab-panel').forEach(p => {
        const ativo = p.dataset.panel === nome;
        p.classList.toggle('tab-panel--active', ativo);
        p.hidden = !ativo;
    });
}

// ==================== HISTÓRICO USUÁRIO ====================
function renderHistorico() {
    const container = $('history-container');
    if (!container) return;
    const lista = lerHistorico();
    if (lista.length === 0) {
        container.innerHTML = '<p class="history__empty">Nenhuma solicitação registrada ainda. Envie o formulário acima para ver o histórico aqui.</p>';
        return;
    }
    container.innerHTML = lista.map(r => {
        const status = r.status || 'Em fila';
        const statusClass = status === 'Concluído' ? 'analyst-item__status--concluido' :
                            status === 'Em análise' ? 'analyst-item__status--analise' :
                            'analyst-item__status--fila';
        return `<article class="history-item" data-id="${escapeHTML(r.id)}">
            <div>
                <span class="history-item__id">${escapeHTML(r.id)}</span>
                <span class="history-item__date">${escapeHTML(formatarDataHora(r.dataISO))}</span>
            </div>
            <div>
                <div class="history-item__title">${escapeHTML(r.dados.nomeProcesso || 'Sem nome')}</div>
                <span class="history-item__objective">${escapeHTML(r.dados.objetivo || '')}</span>
            </div>
            <span class="analyst-item__status ${statusClass}">${escapeHTML(status)}</span>
            <button class="history-item__btn" data-action="ver" data-id="${escapeHTML(r.id)}">Ver resultado</button>
        </article>`;
    }).join('');

    container.querySelectorAll('[data-action="ver"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const r = buscarRegistro(btn.dataset.id);
            if (r) renderResultado(r);
        });
    });
}

// ==================== SUBMIT DO FORMULÁRIO ====================
const form = $('bpmn-form');
form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const erros = validarFormulario();
    const fb = $('form-feedback');
    if (erros.length > 0) {
        fb.classList.add('is-error');
        fb.textContent = `Preencha os campos obrigatórios: ${erros.join(', ')}.`;
        document.querySelector('.is-invalid')?.focus();
        return;
    }
    const dados = coletarDados();
    const registro = {
        id: gerarID(),
        dataISO: new Date().toISOString(),
        dados,
        sugestoes: gerarSugestoes(dados),
        status: 'Em fila',
        arquivos: [],
        notas: '',
        resumoFinal: ''
    };
    adicionarAoHistorico(registro);
    renderResultado(registro);
    renderHistorico();
    fb.classList.remove('is-error');
    fb.classList.add('is-success');
    fb.textContent = `✓ Solicitação ${registro.id} registrada com sucesso! Você pode acompanhar o status no histórico abaixo.`;
    setTimeout(() => { form.reset(); limparEstadoValidacao(); }, 2000);
});

FIELDS.forEach(f => {
    const el = $(f.id);
    el?.addEventListener('input', () => {
        if (el.classList.contains('is-invalid') && el.value.trim()) el.classList.remove('is-invalid');
    });
});

form?.addEventListener('reset', limparEstadoValidacao);

// ==================== TABS ====================
$$('.tab').forEach(tab => {
    tab.addEventListener('click', () => ativarAba(tab.dataset.tab));
});

// ==================== AÇÕES RESULTADO USUÁRIO ====================
$('btn-nova')?.addEventListener('click', () => {
    $('resultado').hidden = true;
    form.reset();
    limparEstadoValidacao();
    scrollTo($('solicitar'));
});

$('btn-imprimir')?.addEventListener('click', () => {
    $$('.tab-panel').forEach(p => p.hidden = false);
    window.print();
    setTimeout(() => {
        $$('.tab-panel').forEach(p => {
            if (!p.classList.contains('tab-panel--active')) p.hidden = true;
        });
    }, 500);
});

$('btn-limpar-historico')?.addEventListener('click', () => {
    if (!confirm('Apagar todo o histórico local? Esta ação não pode ser desfeita.')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderHistorico();
});

// ==================== ÁREA DO ANALISTA ====================

function mostrarViewAnalista() {
    $('view-usuario').hidden = true;
    $('view-usuario').classList.remove('view--active');
    $('view-analista').hidden = false;
    $('view-analista').classList.add('view--active');

    // Verifica sessão
    if (sessionStorage.getItem(ANALYST_SESSION_KEY) === 'true') {
        mostrarDashboard();
    } else {
        $('login-section').hidden = false;
        $('analyst-dashboard').hidden = true;
        $('analyst-detail').hidden = true;
    }
    window.scrollTo(0, 0);
}

function mostrarViewUsuario() {
    $('view-analista').hidden = true;
    $('view-analista').classList.remove('view--active');
    $('view-usuario').hidden = false;
    $('view-usuario').classList.add('view--active');
    window.scrollTo(0, 0);
}

function mostrarDashboard() {
    $('login-section').hidden = true;
    $('analyst-detail').hidden = true;
    $('analyst-dashboard').hidden = false;
    renderDashboard();
}

function mostrarDetalhe(id) {
    currentDetailId = id;
    $('login-section').hidden = true;
    $('analyst-dashboard').hidden = true;
    $('analyst-detail').hidden = false;
    renderDetalhe(id);
    window.scrollTo(0, 0);
}

// Login
$('btn-area-analista')?.addEventListener('click', mostrarViewAnalista);
$('btn-voltar-login')?.addEventListener('click', mostrarViewUsuario);

$('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const senha = $('senha-analista').value;
    const fb = $('login-feedback');
    if (senha === ANALYST_PASSWORD) {
        sessionStorage.setItem(ANALYST_SESSION_KEY, 'true');
        fb.className = 'form__feedback';
        fb.textContent = '';
        $('senha-analista').value = '';
        mostrarDashboard();
    } else {
        fb.classList.add('is-error');
        fb.textContent = 'Senha incorreta. Tente novamente.';
        $('senha-analista').focus();
    }
});

$('btn-sair-analista')?.addEventListener('click', () => {
    sessionStorage.removeItem(ANALYST_SESSION_KEY);
    mostrarViewUsuario();
    renderHistorico(); // atualiza status que possa ter mudado
});

$('btn-voltar-dashboard')?.addEventListener('click', mostrarDashboard);

// Dashboard
let filtroAtivo = 'todos';

function renderDashboard() {
    const lista = lerHistorico();
    const total = lista.length;
    const fila = lista.filter(r => (r.status || 'Em fila') === 'Em fila').length;
    const analise = lista.filter(r => r.status === 'Em análise').length;
    const concluidas = lista.filter(r => r.status === 'Concluído').length;

    $('stat-total').textContent = total;
    $('stat-fila').textContent = fila;
    $('stat-analise').textContent = analise;
    $('stat-concluidas').textContent = concluidas;

    const filtradas = filtroAtivo === 'todos' ? lista : lista.filter(r => (r.status || 'Em fila') === filtroAtivo);
    const ul = $('analyst-list');

    if (filtradas.length === 0) {
        ul.innerHTML = '<p class="history__empty">Nenhuma solicitação nesta categoria.</p>';
        return;
    }

    ul.innerHTML = filtradas.map(r => {
        const status = r.status || 'Em fila';
        const statusClass = status === 'Concluído' ? 'analyst-item__status--concluido' :
                            status === 'Em análise' ? 'analyst-item__status--analise' :
                            'analyst-item__status--fila';
        return `<article class="analyst-item" data-id="${escapeHTML(r.id)}">
            <div class="analyst-item__meta">
                <span class="analyst-item__id">${escapeHTML(r.id)}</span>
                <span class="analyst-item__date">${escapeHTML(formatarDataHora(r.dataISO))}</span>
            </div>
            <div class="analyst-item__body">
                <div class="analyst-item__title">${escapeHTML(r.dados.nomeProcesso || 'Sem nome')}</div>
                <span class="analyst-item__objective">${escapeHTML(r.dados.objetivo || '')}</span>
            </div>
            <span class="analyst-item__status ${statusClass}">${escapeHTML(status)}</span>
            <span class="analyst-item__arrow">→</span>
        </article>`;
    }).join('');

    ul.querySelectorAll('.analyst-item').forEach(el => {
        el.addEventListener('click', () => mostrarDetalhe(el.dataset.id));
    });
}

// Filtros
$$('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.filter').forEach(b => b.classList.remove('filter--active'));
        btn.classList.add('filter--active');
        filtroAtivo = btn.dataset.filter;
        renderDashboard();
    });
});

// Exportar tudo
$('btn-exportar-todas')?.addEventListener('click', () => {
    const lista = lerHistorico();
    const blob = new Blob([JSON.stringify(lista, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitacoes_bpmn_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// ==================== DETALHE DA SOLICITAÇÃO ====================
function renderDetalhe(id) {
    const r = buscarRegistro(id);
    if (!r) { mostrarDashboard(); return; }

    $('detail-id').textContent = r.id;
    $('detail-date').textContent = formatarDataHora(r.dataISO);
    $('detail-title').textContent = r.dados.nomeProcesso || 'Sem nome';

    const status = r.status || 'Em fila';
    const statusBadge = $('detail-status-badge');
    statusBadge.textContent = status;
    statusBadge.className = 'detail-status';
    if (status === 'Em análise') statusBadge.classList.add('detail-status--analise');
    else if (status === 'Concluído') statusBadge.classList.add('detail-status--concluido');

    renderResumo(r.dados, $('detail-summary'));

    // Status buttons
    $$('#status-buttons .status-btn').forEach(b => {
        b.classList.toggle('status-btn--active', b.dataset.status === status);
    });

    $('analyst-notes').value = r.notas || '';
    $('analyst-resumo').value = r.resumoFinal || '';

    renderListaArquivosAnalista(r.arquivos || []);
}

// Botões de status
$$('#status-buttons .status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('#status-buttons .status-btn').forEach(b => b.classList.remove('status-btn--active'));
        btn.classList.add('status-btn--active');
    });
});

// Prompt para IA
$('btn-copiar-prompt')?.addEventListener('click', async () => {
    const r = buscarRegistro(currentDetailId);
    if (!r) return;
    const prompt = gerarPromptParaIA(r);
    try {
        await navigator.clipboard.writeText(prompt);
        const fb = $('analyst-feedback');
        fb.classList.remove('is-error');
        fb.classList.add('is-success');
        fb.textContent = '✓ Prompt copiado! Cole no Claude.ai para gerar o BPMN.';
        setTimeout(() => { fb.className = 'form__feedback'; fb.textContent = ''; }, 4000);
    } catch (err) {
        // Fallback: abre uma janela com o texto
        const w = window.open('', '_blank');
        w.document.write(`<pre style="white-space:pre-wrap;font-family:monospace;padding:20px;">${escapeHTML(prompt)}</pre>`);
    }
});

function gerarPromptParaIA(registro) {
    const d = registro.dados;
    return `Você é um analista sênior de processos, especialista em BPMN 2.0, Lean e Six Sigma.

Analise o processo abaixo e me entregue:

1. **Resumo consolidado do AS IS** (atores, etapas, decisões, entradas/saídas)
2. **Diagrama BPMN AS IS** em XML BPMN 2.0, importável no Bizagi Modeler
3. **Análise crítica** identificando gargalos, retrabalho, dependências e riscos
4. **Sugestões de melhoria** (automação, paralelismo, padronização, redução de etapas)
5. **Diagrama BPMN TO BE** em XML BPMN 2.0 com as melhorias aplicadas
6. **PDF dos diagramas** se possível, ou descrição visual detalhada

Regras:
- Use namespace OMG (http://www.omg.org/spec/BPMN/20100524/MODEL)
- Inclua BPMNDiagram com shapes e edges com coordenadas
- Não invente informações não fornecidas; se faltar dado, sinalize como lacuna
- Priorize clareza e simplicidade sobre complexidade

---

**DADOS DO PROCESSO (ID: ${registro.id})**

**Nome do processo:** ${d.nomeProcesso || '—'}
**Objetivo:** ${d.objetivo || '—'}
**Solicitante:** ${d.solicitante || '—'}

**Evento de início:** ${d.eventoInicio || '—'}
**Evento de fim:** ${d.eventoFim || '—'}

**Atores envolvidos:** ${d.atores || '—'}
**Sistemas utilizados:** ${d.sistemas || 'Não informado'}

**Etapas principais:**
${d.etapas || '—'}

**Pontos de decisão:**
${d.decisoes || 'Não informado'}

**Exceções ou retrabalho:**
${d.excecoes || 'Não informado'}

**SLA ou prazo esperado:** ${d.sla || 'Não definido'}

---

Comece pela Etapa 1 (coleta e consolidação). Se precisar de algum esclarecimento antes de prosseguir, pergunte.`;
}

// Upload de arquivos
const uploadZone = $('upload-zone');
const fileInput = $('file-input');

uploadZone?.addEventListener('click', () => fileInput.click());

uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('upload-zone--dragover');
});

uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('upload-zone--dragover');
});

uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('upload-zone--dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput?.addEventListener('change', (e) => handleFiles(e.target.files));

async function handleFiles(files) {
    if (!currentDetailId) return;
    const r = buscarRegistro(currentDetailId);
    if (!r) return;

    const arquivos = r.arquivos || [];
    const fb = $('analyst-feedback');

    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            fb.classList.add('is-error');
            fb.textContent = `Arquivo "${file.name}" excede 5MB e foi ignorado.`;
            continue;
        }
        const dataUrl = await fileToDataURL(file);
        arquivos.push({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
            addedAt: new Date().toISOString()
        });
    }

    atualizarRegistro(currentDetailId, { arquivos });
    renderListaArquivosAnalista(arquivos);
    fileInput.value = '';
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderListaArquivosAnalista(arquivos) {
    const ul = $('file-list');
    if (!ul) return;
    if (!arquivos || arquivos.length === 0) {
        ul.innerHTML = '';
        return;
    }
    ul.innerHTML = arquivos.map((a, i) => `
        <li class="file-item">
            <span class="file-item__icon">${extIcon(a.name)}</span>
            <span class="file-item__name">${escapeHTML(a.name)}</span>
            <span class="file-item__size">${formatarTamanho(a.size)}</span>
            <button class="file-item__remove" data-idx="${i}" title="Remover">×</button>
        </li>
    `).join('');

    ul.querySelectorAll('.file-item__remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const r = buscarRegistro(currentDetailId);
            const arquivos = r.arquivos || [];
            arquivos.splice(idx, 1);
            atualizarRegistro(currentDetailId, { arquivos });
            renderListaArquivosAnalista(arquivos);
        });
    });
}

// Salvar rascunho / concluir
$('btn-salvar-rascunho')?.addEventListener('click', () => {
    if (!currentDetailId) return;
    const statusAtivo = document.querySelector('#status-buttons .status-btn--active');
    const novoStatus = statusAtivo ? statusAtivo.dataset.status : 'Em fila';
    atualizarRegistro(currentDetailId, {
        status: novoStatus,
        notas: $('analyst-notes').value,
        resumoFinal: $('analyst-resumo').value
    });
    const fb = $('analyst-feedback');
    fb.classList.remove('is-error');
    fb.classList.add('is-success');
    fb.textContent = '✓ Rascunho salvo.';
    setTimeout(() => { fb.className = 'form__feedback'; fb.textContent = ''; }, 2500);
    renderDetalhe(currentDetailId);
});

$('btn-concluir')?.addEventListener('click', () => {
    if (!currentDetailId) return;
    const r = buscarRegistro(currentDetailId);
    if (!r) return;
    const arquivos = r.arquivos || [];

    if (arquivos.length === 0) {
        if (!confirm('Nenhum arquivo foi anexado. Deseja concluir mesmo assim?')) return;
    }

    atualizarRegistro(currentDetailId, {
        status: 'Concluído',
        notas: $('analyst-notes').value,
        resumoFinal: $('analyst-resumo').value,
        concluidoEm: new Date().toISOString()
    });

    const fb = $('analyst-feedback');
    fb.classList.remove('is-error');
    fb.classList.add('is-success');
    fb.textContent = '✓ Solicitação marcada como concluída! O solicitante já pode ver os arquivos.';

    setTimeout(() => { mostrarDashboard(); }, 1500);
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    renderHistorico();
});
