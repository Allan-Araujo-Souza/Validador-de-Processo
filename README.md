# Central de Mapeamento de Processos — LP (MVP)

Landing Page interna para centralizar solicitações de mapeamento de processos BPMN. Substitui o uso de chat/e-mail como entrada principal, padronizando a coleta de informações e oferecendo retorno estruturado ao solicitante.

---

## Stack

- **HTML5** semântico
- **CSS puro** (variáveis CSS, responsivo, sem frameworks)
- **JavaScript vanilla** (ES6+, sem dependências)
- **Fontes:** Google Fonts (Fraunces + Inter)
- **Persistência:** `localStorage` (histórico local por navegador)

---

## Estrutura do projeto

```
bpmn-lp/
├── index.html          # Estrutura da LP
├── style.css           # Visual editorial corporativo, responsivo
├── script.js           # Validação, envio, resultado, histórico
├── assets/             # (vazio — reservado para futuras imagens)
└── README.md           # Este arquivo
```

---

## Como abrir e testar no VS Code

### Opção 1 — Live Server (recomendado)

1. Abra o VS Code
2. Abra a pasta `bpmn-lp` (menu **File → Open Folder**)
3. Instale a extensão **Live Server** (autor: Ritwick Dey) na aba Extensions (`Ctrl+Shift+X`)
4. Clique com o botão direito em `index.html` → **Open with Live Server**
5. O navegador abrirá automaticamente em: **http://127.0.0.1:5500/index.html**

### Opção 2 — Servidor Python (sem instalar extensão)

Abra o terminal integrado do VS Code (`Ctrl+'`) na pasta do projeto e execute:

```bash
# Python 3
python -m http.server 8000

# ou, se o comando acima não funcionar:
python3 -m http.server 8000
```

Depois abra no navegador: **http://localhost:8000**

### Opção 3 — Servidor Node (npx serve)

Se você tem Node.js instalado:

```bash
npx serve .
```

O terminal mostrará o link (geralmente **http://localhost:3000**).

### Opção 4 — Abrir direto no navegador

Você pode dar duplo clique em `index.html` e ele abrirá direto. **Funciona**, mas algumas funcionalidades podem ter pequenas limitações (ex: `localStorage` funciona em `file://`, mas é tratado de forma diferente em alguns navegadores). Recomendamos uma das opções acima para simular melhor o ambiente web.

---

## Funcionalidades

### Formulário (10 campos)

| Campo | Obrigatório |
|---|---|
| Nome do processo | Sim |
| Objetivo | Sim |
| Evento de início | Sim |
| Evento de fim | Sim |
| Atores envolvidos | Sim |
| Sistemas utilizados | Não |
| Etapas principais | Sim |
| Pontos de decisão | Não |
| Exceções ou retrabalho | Não |
| SLA ou prazo esperado | Não |

Validação em tempo real (campos obrigatórios vazios destacam-se em vermelho ao enviar).

### Tela de resultado (após envio)

- **ID único** no formato `SOL-2026-0001`
- **Data/hora** da solicitação
- **4 abas**:
  - **Resumo** — todos os campos estruturados
  - **BPMN AS IS** — placeholder aguardando análise
  - **BPMN TO BE** — placeholder aguardando análise
  - **Melhorias** — sugestões heurísticas baseadas nos dados informados
- **Ações:**
  - Nova solicitação
  - Imprimir resumo

### Histórico

Todas as solicitações enviadas ficam em `localStorage` no navegador. Na seção "Histórico recente" é possível:
- Visualizar todas as solicitações com ID, data, nome e status
- Reabrir o resultado de uma solicitação anterior
- Limpar o histórico completo (com confirmação)

**Limite:** armazena as 20 solicitações mais recentes.

---

## Como funciona o algoritmo de sugestões

O `script.js` analisa o conteúdo dos campos e gera recomendações baseadas em **heurísticas simples**:

- **Sem SLA definido** → sugere formalização
- **E-mail como canal** → sugere formulário estruturado
- **Retrabalho mencionado** → sugere validação prévia
- **Muitos atores (≥4)** → sugere orquestração centralizada
- **Sem automação** → sugere revisão de candidatos a automação
- **Sempre inclui:** repositório centralizado + instrumentação de métricas

Em produção, esta lógica pode ser substituída por uma API que gera o BPMN real e análise por IA.

---

## Responsividade

Testado em:
- Desktop (1920px, 1440px, 1280px)
- Tablet (1024px, 768px)
- Mobile (414px, 375px)

Breakpoints principais: 900px e 700px.

---

## Roadmap de evolução (pós-MVP)

1. Integração com **Power Automate** para:
   - Receber submissão via webhook
   - Notificar Backoffice por e-mail
   - Gravar em lista SharePoint
2. Área autenticada via **SSO Microsoft 365**
3. Dashboard gerencial (fila, SLA, métricas por área)
4. Upload de documentos de apoio (anexos)
5. Geração automática de BPMN usando IA + engine BPMN 2.0
6. Integração com **Bizagi** para publicação do modelo final

---

## Suporte

Dúvidas sobre a LP ou sobre o processo de mapeamento:
**processos@empresa.com.br**

---

**Versão:** MVP 1.0
**Última atualização:** 2026
