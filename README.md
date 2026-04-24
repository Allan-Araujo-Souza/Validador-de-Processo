# Central de Mapeamento de Processos — LP (MVP v2)

Landing Page interna para centralizar solicitações de mapeamento de processos BPMN. Agora com **duas visões**: usuário final (solicitante) e analista de processos.

## Como abrir no VS Code

1. Abra a pasta do projeto (`File → Open Folder`)
2. Instale a extensão **Live Server** (autor: Ritwick Dey)
3. Clique com botão direito em `index.html` → **Open with Live Server**
4. Navegador abre automaticamente em `http://127.0.0.1:5500/index.html`

Alternativa sem extensão (terminal do VS Code, `Ctrl+'`):
```bash
python -m http.server 8000
```
Depois abra `http://localhost:8000`.

## Modos de uso

### Visão do usuário (padrão)
- Preenche formulário com 10 campos sobre o processo
- Recebe ID único da solicitação (ex: `SOL-2026-0001`)
- Acompanha status pelo histórico (Em fila / Em análise / Concluído)
- Quando concluída, vê os arquivos anexados pelo analista

### Visão do analista
- Clique em **"Área do analista"** no header (canto superior direito)
- Senha padrão: `analista2026`
- Dashboard com métricas e lista de todas as solicitações
- Filtros por status (Em fila, Em análise, Concluídas)
- Clique em uma solicitação para ver detalhes

## Fluxo do analista

1. **Abre uma solicitação** na lista
2. **Clica em "Copiar prompt pronto para IA"** — texto completo vai para a área de transferência
3. **Cola no Claude.ai** (ou ChatGPT, Gemini etc) e recebe o BPMN gerado
4. **Gera os PDFs e arquivos .bpmn** localmente
5. **Faz upload dos arquivos** na área do analista (PDF, BPMN, PNG, DOCX — até 5MB cada)
6. **Adiciona anotações internas** e resumo final
7. **Muda status** para "Em análise" ou "Concluído"
8. **Clica em "Marcar como concluído"**

Quando concluído, o usuário verá automaticamente:
- Status atualizado no histórico
- Arquivos disponíveis para download nas abas AS IS e TO BE
- Resumo final escrito pelo analista

## Estrutura dos arquivos por convenção

Para que os arquivos apareçam na aba certa do usuário, use estas convenções no nome:
- `*_as_is.*` ou `*asis*` → vai para aba **BPMN AS IS**
- `*_to_be.*` ou `*tobe*` → vai para aba **BPMN TO BE**
- Outros arquivos aparecem na aba AS IS por padrão

Exemplos válidos: `processo_as_is.pdf`, `Termo_Aditivo_TO_BE.bpmn`, `analise_asis.docx`

## Persistência

Tudo é salvo em `localStorage` do navegador (escopo local, por usuário, por máquina).

**Limitações do MVP:**
- Dados ficam apenas no navegador atual — não há sincronização entre máquinas
- Arquivos grandes ocupam espaço (localStorage tem ~5-10MB por domínio)
- Sessão do analista expira ao fechar a aba

**Evolução natural:** migrar para SharePoint / Power Automate / Azure Storage quando o volume justificar.

## Exportar para backup

Na área do analista, botão **"Exportar tudo (JSON)"** gera arquivo com todos os registros (útil para backup ou migração futura).

## Estrutura do projeto

```
bpmn-lp/
├── index.html          Estrutura HTML das duas visões
├── style.css           Estilos CSS (editorial corporativo)
├── script.js           Lógica: validação, upload, dashboard, prompt IA
└── README.md           Este arquivo
```

## Stack

- HTML5, CSS puro, JavaScript vanilla ES6+
- Sem frameworks, sem dependências externas (exceto Google Fonts)
- Persistência: `localStorage` + `sessionStorage`
- Compatível com: Chrome, Firefox, Safari, Edge (versões recentes)

## Suporte

Dúvidas: **processos@empresa.com.br**

**Versão:** MVP v2.0 — Duas visões (usuário + analista)
