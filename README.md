# Prism Field (Toolcraft)

Campo de luz prismática animada em WebGL2, feito com [Toolcraft](https://github.com/pixel-point/toolcraft).
É a segunda versão do Prism Field: a primeira era uma página HTML simples (`prism/` no repositório
`classiccarlab`); esta usa o painel, o canvas, a timeline e a exportação do Toolcraft.

```bash
npm install
npm run dev        # http://localhost:3002
npm run build
```

O Toolcraft só abre em janelas com pelo menos 1024 px de largura.

## O que veio da primeira versão

Todos os controlos da primeira app existem como controlos do Toolcraft, agrupados em secções:
Presets · Motion · Fold Layers · Surface Detail · Lighting · Highlights · Spectrum · Refraction ·
Glow · Placement · Light Mask · Background · Backdrop · Finish. Há 8 presets, "Randomize all",
"Colors only" e um botão "Randomize" por secção.

| Primeira app | Toolcraft |
| --- | --- |
| Velocidade, deriva, evolução, viagem das pregas, deriva de matiz | Ciclos inteiros por loop da timeline (ver abaixo) |
| Formato, resolução de render, tamanho de exportação | Aspect ratio, Resolution scale (1–2) e Image Export (2K/4K/8K) do Setup |
| Fundo A, fundo transparente | Background (interruptor + cor) do Setup |
| Fundo B, ângulo e quantidade do fundo | Secção Backdrop |
| Pausa | Timeline |
| Gravar vídeo, PNG | Export MP4/WebM e Export PNG/JPG |
| Copiar e colar definições | Import/Export Settings |
| Repor | Reset do cabeçalho do painel |

### Movimento em loop

A timeline tem um loop com duração editável (20 s por omissão) e o Toolcraft exige loops sem salto.
Por isso cada movimento é um número inteiro de ciclos por loop:

- **Cycles per loop**: quantas voltas completas a animação dá no loop.
- **Fold travel** e **Hue cycles**: voltas inteiras das pregas e do matiz.
- **Drift radius** e **Morphing**: raios de órbitas circulares no espaço do ruído.

O primeiro e o último fotograma do loop são idênticos. O grão de filme é fixo, não animado.

### O que não foi portado

- Ecrã inteiro e atalhos de teclado da primeira app.
- Formato "Preencher janela" (o Toolcraft tem artboard fixo ou Infinity canvas).
- Uso em telemóvel: o Toolcraft só funciona em desktop.

## Estado da verificação

- `npm run build` e `tsc` passam. `scripts/check-toolcraft-integrity.mjs` passa.
- `src/app/app-schema.test.ts` passa (esquema, valores por omissão, presets, aleatório, loop sem salto).
- **A matriz de aceitação do Toolcraft não foi escrita.** `app-acceptance-data.ts` ainda está em modo
  starter, sem uma linha de aceitação nem teste de browser por controlo, e o worklog não foi
  preenchido. Por isso `vitest` ainda falha nos testes de cobertura (`app-acceptance.*`,
  `app-performance.gates`) e `npm run verify:delivery` não foi corrido.
- Em `npm test`, 8 testes de infraestrutura do próprio Toolcraft falham neste ambiente (caminho de
  módulos globais, tempos, `npm` em vez de `pnpm`, portas IPv4). Não tocam no código da app.
