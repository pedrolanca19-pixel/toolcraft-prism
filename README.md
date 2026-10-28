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

- `npm run verify:delivery` **passou** (exit 0) e `npm run verify:receipt` confirma que a autoridade de
  entrega está atual e válida: docs, code-health, 715 testes unitários e 110 testes de browser
  (um por linha da matriz de aceitação, em `e2e/product-*.spec.ts`, um ficheiro por domínio).
- A matriz de aceitação cobre cada controlo, cada ação (presets, randomize, shuffle por secção,
  Edit as custom), Background, exportação PNG/JPG (2K/4K/8K) e MP4/WebM, timeline, Resolution scale,
  Infinity canvas (continuidade, exportação de imagem e de vídeo) e persistência após reload.
- Os testes de browser correram em renderização por software (SwiftShader), num ecrã 160×90; os
  tempos não dizem nada sobre GPU real. A exportação 4K de vídeo prova 3 fotogramas (0,1 s) por
  causa do custo por software. Não foi testado em GPU real nem no Safari/Firefox.
- Os pixels esperados das exportações vêm de uma primeira exportação das mesmas definições
  (prova de determinismo); a fidelidade em relação ao preview é medida à parte (distância média
  por blocos 8×8 abaixo de 16) e o JPG é comparado com o PNG.
- Os testes apanharam e corrigiram dois defeitos reais: a exportação 8K saía cortada (limite do buffer
  WebGL do browser, agora exporta-se em tiles de 4096 px) e o wrapper do canvas cortava o output no
  modo Infinity.
- O descodificador de vídeo do browser headless por vezes devolve o primeiro fotograma ainda por
  pintar; os testes voltam a descodificar e `actions.output` repete com uma exportação nova.
