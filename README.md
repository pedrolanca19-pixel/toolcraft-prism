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
Glow · Placement · Glass Ribs · Light Mask · Background · Backdrop · Finish. Há 9 presets, "Randomize all",
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

### Vidro canelado (Glass Ribs)

Secção nova, ausente da primeira versão: corta o enquadramento em barras que funcionam como lentes
cilíndricas à frente da folha de luz (cada barra mostra uma fatia invertida e deslocada do campo).
Controlos: número de barras, largura, irregularidade, orientação (vertical ou inclinada), força da
lente, deslocamento da lente, brilho nas arestas e largura das arestas. O preset **Fluted glass**
aproxima o poster "Vitrium Opus"; funciona melhor num canvas vertical (por exemplo 5:7).
É uma aproximação: mantém o preto, as barras com degradê interno, o grão e o brilho ciano/azul/branco,
mas não reproduz o desenho exato das manchas nem os laranjas do poster.

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

- A entrega inicial passou `npm run verify:delivery` (exit 0) e `npm run verify:receipt` confirmou a
  autoridade de entrega: docs, code-health, 715 testes unitários e 110 testes de browser (um por linha
  da matriz de aceitação, em `e2e/product-*.spec.ts`, um ficheiro por domínio).
- Depois disso entraram a secção **Glass Ribs** e os presets **Fluted glass** e **Fluted glass soft**.
  O Toolcraft pede `npm run test:feature -- <ids>` para alterações posteriores; neste sandbox esse
  comando não arranca (o passo `load-feature-plan` ultrapassa o limite protegido de 20 s porque a
  máquina ficou mais lenta). Em vez disso corri todas as specs de browser diretamente:
  **119 de 120 passaram**. A falha, `export.image.resolution`, é a exportação 8K a ultrapassar os 120 s
  do teste em software GL (8K ≈ 54 s a exportar e 30 s a inspecionar, neste sandbox); na máquina
  anterior passava em 1,4 min. Não foi uma falha de conteúdo (2K e 4K bateram com o preview).
- A matriz cobre cada controlo, cada ação (presets, randomize, shuffle por secção, Edit as custom),
  Background, exportação PNG/JPG (2K/4K/8K) e MP4/WebM, timeline, Resolution scale, Infinity canvas
  (continuidade, exportação de imagem e de vídeo) e persistência após reload.
- Os testes de browser correm em renderização por software (SwiftShader), num ecrã 160×90; os tempos
  não dizem nada sobre GPU real. A exportação 4K de vídeo prova 3 fotogramas (0,1 s). Não foi testado
  em GPU real nem no Safari/Firefox.
- Os pixels esperados nas exportações vêm de uma primeira exportação das mesmas definições (prova de
  determinismo); a fidelidade em relação ao preview é medida à parte (distância média por blocos 8×8
  abaixo de 16) e o JPG é comparado com o PNG.
- Os testes apanharam e corrigiram dois defeitos reais: a exportação 8K saía cortada (limite do buffer
  WebGL do browser, agora exporta-se em tiles de 4096 px) e o wrapper do canvas cortava o output no
  modo Infinity.
- O descodificador de vídeo do browser headless por vezes devolve o primeiro fotograma ainda por
  pintar; os testes voltam a descodificar e `actions.output` repete com uma exportação nova.
