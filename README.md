# Guardrail

**Protect your edge. Enforce your rules.**

Consistência no longo prazo começa com regras que você não pode quebrar.

---

## Visão

Guardrail é uma camada de controle de risco comportamental para mercados de alta variância (inicialmente apostas esportivas).

- Ele **não cria** edge.
- Ele **protege** o edge que o usuário acredita ter.

Guardrail impede que o usuário quebre suas próprias regras no calor do momento.

---

## Problema

A maioria dos apostadores não quebra a banca por falta de estratégia.

Eles quebram por:

- Escalada de stake após loss
- Tentativa de recuperar prejuízo no mesmo dia
- Mudança de mercado sob pressão emocional
- Quebra das próprias regras no tilt
- Live betting impulsivo

**O problema central é comportamental, não técnico.**

---

## Público-alvo

### Foco inicial

Semi-profissionais que:

- Acreditam ter edge
- Pensam no longo prazo
- Já sofreram drawdown significativo
- Querem consistência e longevidade

### Não é focado em

- Apostador recreativo
- Usuário compulsivo
- Bloqueio total de apostas

---

## Posicionamento

**Guardrail não é:**

- App de saúde mental
- App contra vício
- Tracker de apostas

**Guardrail é:**

Infraestrutura de disciplina para operadores sérios.

---

## Promessa

**Protect your edge. Enforce your rules.**

Consistência no longo prazo começa com disciplina.

---

## MVP V1 — Escopo Estrito

### Objetivo do MVP

Validar se usuários pagam para ter suas regras bloqueadas.

- Sem IA.
- Sem backend complexo.
- Sem analytics avançado.

### Funcionalidades do MVP

#### Configuração Inicial Obrigatória

Usuário define:

- `stake_base`
- `stake_max`
- `stop_diario`
- `ativar_bloqueio_apos_loss_streak` (boolean)

Confirma:

> "Não poderei alterar essas regras durante uma sessão."

#### Stake Lock (Regra Principal)

Se `stake_inserida > stake_max`:

- Bloquear aposta
- Exibir modal: *"Você está quebrando sua regra de stake."*
- Sem exceção.

#### Stop Diário

Se perda acumulada >= `stop_diario`:

- Sessão bloqueada
- Apostas impedidas até reset

#### Cooldown Innegociável

Se:

- 2 losses consecutivas
- OU stake escalation detectada

Ativar cooldown temporário (ex: 1 hora)

Durante cooldown:

- Bloqueio total de apostas

#### Alteração de Regras

Regras só podem ser alteradas:

- Fora de sessão ativa
- E com lock de 24h após mudança

---

## Versão Futura (não implementar agora)

- Risk Score dinâmico
- Detecção automática via DOM de win/loss
- Perfil comportamental adaptativo
- Multi-mercado (trade, cripto, poker)
- Backend com histórico
- Dashboard analítico
- Plano Pro

---

## Arquitetura Técnica (Chrome Extension Manifest V3)

### Stack

- TypeScript
- Vite (build)
- Manifest V3
- `chrome.storage.local`
- Content Script + Service Worker
- HTML/CSS simples (sem React no MVP)

### Estrutura de Pastas

```
guardrail/
│
├── manifest.json
│
├── src/
│   ├── background.ts
│   ├── content.ts
│   ├── shared/
│   │   ├── rules.ts
│   │   ├── storage.ts
│   │   └── types.ts
│   │
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   │
│   ├── options/
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│
└── dist/
```

### Componentes

#### manifest.json

Declara:

- background service worker
- content_scripts
- **permissions:** `storage`, `scripting`, `activeTab`
- **host_permissions:** domínios das casas de apostas

#### background.ts

Responsável por:

- Gerenciar estado da sessão
- Controlar cooldown
- Gerenciar regras globais
- Reset diário

#### content.ts

Responsável por:

- Detectar botão "apostar"
- Interceptar clique
- Ler stake do input
- Validar regras
- Injetar modal Guardrail
- Bloquear ou permitir ação

#### popup

Responsável por:

- Mostrar status da sessão
- Exibir regras atuais
- Mostrar cooldown ativo
- Mostrar bloqueios do dia

#### options

Responsável por:

- Configuração inicial
- Alteração de `stake_base`
- Alteração de `stake_max`
- Definir stop diário
- Aplicar lock de 24h

---

## Lógica Principal

### Variáveis de Estado

| Variável | Descrição |
|----------|-----------|
| `stake_base` | Stake base definida |
| `stake_max` | Stake máxima permitida |
| `stop_diario` | Limite de perda diária |
| `loss_streak` | Sequência de losses |
| `perda_acumulada_dia` | Perda acumulada no dia |
| `cooldown_until` | Timestamp fim do cooldown |
| `session_active` | Sessão ativa |
| `rules_locked_until` | Lock das regras |

### Fluxo ao clicar em "Apostar"

1. Interceptar clique
2. Ler stake do input
3. Validar:
   - `stake > stake_max`?
   - cooldown ativo?
   - stop diário atingido?
4. Se inválido:
   - Bloquear
   - Exibir modal com motivo
5. Se válido:
   - Permitir ação

---

## Modal Guardrail

**Tom:** Técnico. Direto. Sem julgamento emocional.

**Exemplos:**

- "Você está quebrando sua política de risco."
- "Stake acima do limite definido."
- "Stop diário atingido. Sessão encerrada."
- "Cooldown ativo até 21:40."

---

## Landing Page (Português)

**Headline:**

> Consistência no longo prazo começa com regras que você não pode quebrar.

**Subheadline:**

> Menos decisões emocionais. Mais disciplina. Menos banca quebrada.

---

## Estratégia de Validação

1. Criar landing simples (Carrd ou Framer)
2. Abrir beta fechado
3. Cobrar R$19,90/mês no beta
4. Falar com 10 apostadores semi-pro

**Medir:**

- Instalação
- Uso por 7 dias
- Pagamento

### Métrica de Sucesso Inicial

- **Se >10% dos usuários beta pagarem:** Forte sinal de validação
- **Se <5%:** Revisar proposta de valor

---

## Objetivo 2 Anos

- **5.000** usuários pagantes
- Preço médio estimado: **R$29,90–R$49,90**
- Receita alvo aproximada: **R$150k–R$250k/mês**

---

## Filosofia do Produto

Guardrail não impede você de operar.

Ele impede você de sair da pista.

Ele não cria vantagem.

Ele protege disciplina.

### Regra Fundamental

> Se o usuário quiser quebrar regra, ele precisará desinstalar.
>
> **Guardrail não negocia.**

---

*FIM DO DOCUMENTO*
