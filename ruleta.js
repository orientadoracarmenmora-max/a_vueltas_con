(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const stage = $('stage');
  const stageCard = stage.querySelector('.stage-card');
  const wheelFrame = $('wheel-frame');
  const toolbar = $('main-toolbar');
  const layout = document.querySelector('.layout');
  const settings = layout.querySelector('.settings');
  const mobileLayout = matchMedia('screen and (max-width: 740px)');
  const wheelSize = 900;
  const measure = document.createElement('canvas').getContext('2d');
  const svg = (tag) => document.createElementNS('http://www.w3.org/2000/svg', tag);
  let wheelLabels = [];
  let wheelNeedsRedraw = true;
  const clockCanvas = $('hourglass');
  const clock = clockCanvas.getContext('2d');
  const glassShape = 'M57 54 C56 96 70 116 103 139 C116 148 121 154 123 162 L133 162 C135 154 140 148 153 139 C186 116 200 96 199 54 Z';
  let glassChambers;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const turn = Math.PI * 2;
  const pointerAngle = -Math.PI / 2;

  const exampleQuestions = [
  [
    "Antes de jugar, ¿cómo añado una lista de preguntas?",
    "Elige el modo y pulsa «＋ Añadir preguntas». Pega tu lista, completa la revisión que indique ese modo y pulsa «Importar preguntas»."
  ],
  [
    "Al preparar Preguntas y respuestas, ¿cómo escribo las soluciones?",
    "Numera cada pregunta y escribe su respuesta en la línea siguiente. También puedes escribir pregunta / respuesta en la misma línea. Después, pulsa «Importar preguntas»."
  ],
  [
    "Al preparar un tipo test, ¿cómo marco las soluciones?",
    "Pega las preguntas numeradas con sus opciones A), B), C)… y pulsa «Continuar». Marca el círculo a la derecha de la opción correcta de cada pregunta y pulsa «Importar preguntas»."
  ],
  [
    "Al preparar Verdadero o falso, ¿cómo marco las soluciones?",
    "Pega una afirmación numerada por línea y pulsa «Continuar». Marca Verdadero o Falso en cada afirmación y pulsa «Importar preguntas»."
  ],
  [
    "Durante el juego de Preguntas y respuestas, ¿cómo compruebo mi respuesta?",
    "Responde en voz alta y pulsa «Mostrar respuesta» para leer la solución. Si has activado los puntos, marca después el acierto o el fallo."
  ],
  [
    "Antes de jugar, ¿cómo activo los puntos y el tiempo?",
    "Elige «Sí» en «Jugar con puntos» y selecciona Individual o Por equipos. Para responder con un límite de tiempo, activa «Usar temporizador» y elige los segundos."
  ]
];
  const exampleSoloQuestions = [
  [
    "Durante el juego de Solo preguntas, ¿cómo respondo?",
    "Pulsa «Girar ruleta», lee la pregunta y responde en voz alta."
  ],
  [
    "Antes de jugar, ¿dónde pego mi lista de preguntas?",
    "En la ventana que abre «＋ Añadir preguntas»."
  ],
  [
    "Al preparar Solo preguntas, ¿cómo separo las preguntas de mi lista?",
    "Escribe una pregunta por línea. Puedes numerarlas con 1., 2. y así sucesivamente."
  ],
  [
    "Si juego a Solo preguntas con puntos, ¿cómo se registra el resultado?",
    "La persona que dirige el juego pulsa el tick de más uno para un acierto o la cruz de menos uno para un fallo."
  ],
  [
    "Durante el juego, ¿cómo puedo pausar el reloj de arena?",
    "Pulsa el botón de pausa que aparece al activar el temporizador. Puedes volver a pulsarlo para reanudarlo."
  ],
  [
    "Antes de jugar, ¿qué consigo al activar Sin repeticiones?",
    "Cada pregunta sale una sola vez por ronda. Reiniciar permite comenzar otra ronda."
  ]
];
  const exampleTests = [
  [
    "Durante el juego de Tipo test, ¿cómo respondes?",
    [
      "Pulsando el círculo de la ventana de preparación",
      "Pulsando una opción debajo de la pregunta",
      "Escribiendo la solución en el título"
    ],
    1
  ],
  [
    "Al preparar un test, ¿cómo puedes pegar su contenido?",
    [
      "Pegando todas las preguntas numeradas con sus opciones A), B), C)…",
      "Pegando únicamente las letras de las soluciones",
      "Escribiendo cada respuesta en el título"
    ],
    0
  ],
  [
    "Al preparar un test, ¿qué haces después de pulsar Continuar?",
    [
      "Pulsar Girar ruleta para marcar las soluciones",
      "Esperar a que la ruleta elija las soluciones",
      "Revisar y marcar el círculo de la opción correcta en cada pregunta"
    ],
    2
  ],
  [
    "Después de revisar el test y marcar sus soluciones, ¿qué botón lo carga?",
    [
      "Mostrar respuesta",
      "Importar preguntas",
      "Girar ruleta"
    ],
    1
  ],
  [
    "Si juegas un tipo test con puntos, ¿cómo se registra el acierto o el fallo?",
    [
      "La ruleta lo registra al pulsar una opción",
      "Tienes que marcar otra vez el resultado con un círculo"
    ],
    0
  ],
  [
    "Durante un tipo test con temporizador, ¿qué ocurre al agotarse el tiempo?",
    [
      "La pregunta queda abierta sin límite de tiempo",
      "Se muestra la solución y se cierra la pregunta; con puntos se registra un fallo",
      "Se borra toda la lista"
    ],
    1
  ]
];
  const exampleStatements = [
  [
    "Durante el juego de Verdadero o falso, respondo pulsando uno de esos dos botones debajo de la afirmación.",
    0
  ],
  [
    "Al preparar Verdadero o falso, tengo que escribir V o F después de cada frase en el texto pegado.",
    1
  ],
  [
    "Al preparar las afirmaciones, pulso Continuar y después marco la solución de cada una antes de importar.",
    0
  ],
  [
    "Durante el juego, tengo que volver a marcar la solución en la ventana de Añadir preguntas.",
    1
  ],
  [
    "Si activo Jugar con puntos, la ruleta registra automáticamente el resultado cuando pulso Verdadero o Falso.",
    0
  ],
  [
    "Para jugar a Verdadero o falso siempre tengo que activar el temporizador.",
    1
  ]
];

  function examplesForMode() {
    if ($('mode').value === 'quiz') {
      return exampleTests.map(([question, options, correct]) => ({ question, answer: '', options: [...options], correct }));
    }
    if ($('mode').value === 'binary') {
      return exampleStatements.map(([question, binaryCorrect]) => ({ question, answer: '', binaryCorrect }));
    }
    const examples = $('mode').value === 'questions' ? exampleSoloQuestions : exampleQuestions;
    return examples.map(([question, answer]) => ({ question, answer }));
  }

  let questions = exampleQuestions.map(([question, answer]) => ({ question, answer }));
  let usingExampleList = true;
  let pool = [];
  const drawn = new Set();
  let angle = 0;
  let animation = null;
  let wheelAudio = null;
  let tickSound = null;
  let palette;
  let wheelText = { lines: [], family: '', size: 0 };
  let currentQuestion = '';
  const speech = 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null;
  let utterance = null;
  let speechPauseTimeout;
  let speechStartTimeout;
  let speakingFrom = '';
  let pendingSpeechFrom = '';
  let preferredVoice = '';
  let textScale = 100;
  const bankKey = 'ruleta-test-lista-1';
  const teamColors = [
    { name: 'Azul', color: '#2976c3' }, { name: 'Verde', color: '#29864a' },
    { name: 'Rojo', color: '#c34149' }, { name: 'Morado', color: '#8051b0' },
    { name: 'Naranja', color: '#e68a2a' }, { name: 'Amarillo', color: '#eac239' },
    { name: 'Rosa', color: '#dd72a9' }, { name: 'Turquesa', color: '#189d9f' }
  ];
  const teamAnimals = [
    { name: 'Zorro', icon: '🦊' }, { name: 'Búho', icon: '🦉' },
    { name: 'Pulpo', icon: '🐙' }, { name: 'Tigre', icon: '🐯' },
    { name: 'Delfín', icon: '🐬' }, { name: 'Panda', icon: '🐼' },
    { name: 'Águila', icon: '🦅' }, { name: 'Tortuga', icon: '🐢' }
  ];
  let celebratedTeam = null;
  let players = [];
  let playerIndex = 0;
  let pendingTurn = false;
  let gameFinished = false;
  let timerId = null;
  let deadline = null;
  let pausedTime = null;
  let timerDuration = 0;
  let sandFrame = null;
  let sandFraction = 1;
  let currentAnswer = '';
  let currentEntry = null;

  const isGame = () => $('scoring-enabled').value === 'yes';
  const isTeamGame = () => $('game-type').value === 'team';
  const isQuiz = () => $('mode').value === 'quiz';
  const timerEnabled = () => $('timed').checked;
  const closedMode = () => ['binary', 'quiz'].includes($('mode').value);
  function optionLetter(index) {
    let label = '';
    for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) {
      label = String.fromCharCode(65 + (number - 1) % 26) + label;
    }
    return label;
  }
  const binaryOptions = ['Verdadero', 'Falso'];
  const entryOptions = (entry) => $('mode').value === 'binary' ? binaryOptions : (entry.options || []);
  const hasAnswers = () => $('mode').value !== 'questions';

  function parseQuestions(text) {
    const lines = text.split(/\r\n?|\n/);
    const result = [];
    for (const line of lines) {
      const clean = line.trim().replace(/^[-•–](?:\s+|$)/, '');
      if (/^\d+[.)\-:]$/.test(clean)) continue;
      // A following number is a delimiter when it continues the same sequence.
      const markers = [...clean.matchAll(/(?:^|\s)(\d+)[.)\-:]\s+/g)];
      if (!markers.length) {
        if (clean) result.push(clean);
        continue;
      }
      const first = markers[0];
      const startsNumbered = first.index === 0;
      const inlineList = markers.length > 1 && Number(markers[1][1]) === Number(first[1]) + 1;
      if (!startsNumbered && !inlineList) {
        if (clean) result.push(clean);
        continue;
      }
      const prefix = clean.slice(0, first.index).trim();
      if (prefix) result.push(prefix);
      let previous = first;
      for (const marker of markers.slice(1)) {
        if (Number(marker[1]) !== Number(previous[1]) + 1) continue;
        const part = clean.slice(previous.index + previous[0].length, marker.index).trim();
        if (part) result.push(part);
        previous = marker;
      }
      const last = clean.slice(previous.index + previous[0].length).trim();
      if (last) result.push(last);
    }
    return result;
  }

  function parseEntries(text) {
    if (!hasAnswers()) return parseQuestions(text).map((question) => ({ question, answer: '' }));
    const entries = [];
    let awaitingAnswer = false;
    for (const raw of text.split(/\r\n?|\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const response = line.match(/^\s*(?:[-•]\s*)?respuesta\s*:\s*(.*)$/i);
      if (response && entries.length) {
        const entry = entries.at(-1);
        entry.answer = [entry.answer, response[1].trim()].filter(Boolean).join('\n');
        awaitingAnswer = false;
        continue;
      }
      const numbered = /^(?:[-•–]\s+)?\d+[.)\-:]\s+/.test(line);
      const separator = /\s+\/\s+|\|/.exec(line);
      const prompt = separator ? line.slice(0, separator.index) : line;
      const answer = separator ? line.slice(separator.index + separator[0].length).trim() : '';
      const labeledQuestion = /^pregunta\s*:/i.test(prompt);
      const looksLikeQuestion = prompt.trimStart().startsWith('¿') || prompt.trimEnd().endsWith('?');
      if (awaitingAnswer && !numbered && !labeledQuestion && !looksLikeQuestion) {
        entries.at(-1).answer = line;
        awaitingAnswer = false;
        continue;
      }
      const clean = prompt.replace(/^(\s*(?:\d+[.)-]\s*)?)pregunta\s*:\s*/i, '$1');
      const prompts = parseQuestions(clean);
      for (const [index, question] of prompts.entries()) {
        entries.push({ question, answer: index === prompts.length - 1 ? answer : '' });
      }
      awaitingAnswer = numbered && prompts.length > 0 && !answer;
    }
    return entries;
  }

  function renderEditor() {
    const list = $('question-list');
    list.replaceChildren();
    questions.forEach((value, index) => {
      const row = document.createElement('div');
      row.className = 'edit-row';
      const input = document.createElement('textarea');
      input.rows = 2;
      input.value = value.question;
      input.setAttribute('aria-label', `Pregunta ${index + 1}`);
      input.addEventListener('input', () => {
        value.question = input.value;
        rebuildPool();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'quiet';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Eliminar pregunta ${index + 1}`);
      remove.addEventListener('click', () => {
        questions.splice(index, 1);
        renderEditor();
        rebuildPool();
        const next = list.querySelectorAll('.edit-question')[Math.min(index, questions.length - 1)];
        (next || $('add')).focus();
      });
      input.className = 'edit-question';
      const fields = document.createElement('div');
      fields.className = 'edit-content';
      fields.append(input);
      if (closedMode()) {
        const binary = $('mode').value === 'binary';
        const solutions = document.createElement('select');
        solutions.setAttribute('aria-label', `Solución de la pregunta ${index + 1}`);
        const solutionKey = binary ? 'binaryCorrect' : 'correct';
        const updateSolutions = () => {
          solutions.replaceChildren(new Option('Marca la solución', ''));
          entryOptions(value).forEach((text, i) => {
            if (text.trim()) solutions.add(new Option(binary ? text : `${optionLetter(i)}. ${text}`, String(i)));
          });
          solutions.value = String(value[solutionKey] ?? '');
          if (solutions.selectedIndex < 0) solutions.selectedIndex = 0;
        };
        if (!binary) {
          value.options ??= [];
          for (let i = 0; i < Math.max(4, value.options.length); i++) {
            const letter = optionLetter(i);
            const option = document.createElement('input');
            option.type = 'text';
            option.className = 'option-edit';
            option.value = value.options[i] || '';
            option.placeholder = `Opción ${letter}`;
            option.setAttribute('aria-label', `Opción ${letter}, pregunta ${index + 1}`);
            option.addEventListener('input', () => {
              while (value.options.length <= i) value.options.push('');
              value.options[i] = option.value.trim();
              updateSolutions();
              rebuildPool();
            });
            fields.append(option);
          }
        }
        updateSolutions();
        solutions.addEventListener('change', () => {
          value[solutionKey] = solutions.value === '' ? null : Number(solutions.value);
          rebuildPool();
        });
        fields.append(solutions);
      } else if (hasAnswers()) {
        const answer = document.createElement('textarea');
        answer.rows = 2;
        answer.value = value.answer;
        answer.placeholder = 'Respuesta';
        answer.setAttribute('aria-label', `Respuesta ${index + 1}`);
        answer.addEventListener('input', () => {
          value.answer = answer.value;
          rememberBank();
          if (pool.includes(value) && currentEntry === value) {
            currentAnswer = value.answer.trim();
            setAnswerVisible(false);
          }
        });
        fields.append(answer);
      }
      row.append(fields, remove);
      list.append(row);
    });
  }

  function rebuildPool() {
    pool = questions.filter((entry) => {
      if (!entry.question.trim()) return false;
      if (!closedMode()) return true;
      const binary = $('mode').value === 'binary';
      const options = entryOptions(entry);
      const correct = binary ? entry.binaryCorrect : entry.correct;
      return Number.isInteger(correct) && Boolean(options[correct]?.trim())
        && (binary || Boolean(options[0]?.trim() && options[1]?.trim()));
    });
    $('load-examples').hidden = usingExampleList;
    $('total').textContent = closedMode() ? `${pool.length}/${questions.length} listas` : pool.length;
    rememberBank();
    prepareWheelText();
    resetRound();
  }

  function setResult(value) {
    if (currentQuestion !== value && (speakingFrom === 'listen' || pendingSpeechFrom === 'listen')) stopSpeech();
    currentQuestion = value;
    updateSpeechControls();
    $('question').textContent = value;
    $('result').hidden = !value;
    $('question-announcement').textContent = value;
    const choices = $('closed-choices');
    choices.replaceChildren();
    $('closed-feedback').textContent = '';
    $('listen-answer').hidden = true;
    choices.hidden = !value || !closedMode() || !currentEntry;
    if (!choices.hidden) {
      const binary = $('mode').value === 'binary';
      const correct = binary ? currentEntry.binaryCorrect : currentEntry.correct;
      entryOptions(currentEntry).forEach((text, index) => {
        if (!text.trim()) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quiet';
        button.textContent = binary ? text : `${optionLetter(index)}. ${text}`;
        button.dataset.optionIndex = String(index);
        button.addEventListener('click', () => {
          finishClosedAnswer(index, correct, button);
        });
        choices.append(button);
      });
    }
    delete choices.dataset.answered;
  }

  function finishClosedAnswer(index, correct = currentEntry.correct, button = null) {
    const choices = $('closed-choices');
    if (choices.dataset.answered) return;
    const timedOut = index === null || (closedMode() && deadline !== null && performance.now() >= deadline);
    choices.dataset.answered = 'true';
    for (const option of choices.children) {
      option.setAttribute('aria-disabled', 'true');
      const verdict = Number(option.dataset.optionIndex) === correct ? 'correct'
        : !timedOut && option === button ? 'incorrect' : null;
      if (verdict) {
        option.dataset.verdict = verdict;
        option.append(verdict === 'correct' ? ' ✓' : ' ✕');
      }
    }
    if (isGame()) gradeTurn(index === correct, timedOut);
    else {
      pendingTurn = false;
      stopTimer();
      if (timedOut) showTimerExpired();
      updateControls();
    }
    const solution = entryOptions(currentEntry)[correct];
    $('listen-answer').hidden = false;
    $('closed-feedback').textContent = timedOut
      ? `Tiempo agotado. La respuesta correcta es ${solution}.`
      : '';
  }

  function resetRound() {
    stopSpeech();
    stopTimer();
    pendingTurn = false;
    gameFinished = false;
    currentEntry = null;
    currentAnswer = '';
    setAnswerVisible(false);
    $('game-status').textContent = '';
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    drawn.clear();
    wheelNeedsRedraw = true;
    celebratedTeam = null;
    angle = 0;
    setResult('');
    paint();
    updateControls();
  }

  function updateControls() {
    const unique = $('no-repeat').checked;
    const remaining = pool.length - drawn.size;
    $('progress').textContent = !pool.length ? (closedMode() && questions.length
      ? 'Marca las soluciones en Revisar y editar para empezar' : 'Sin preguntas en la ruleta') : unique
      ? `${pool.length} ${pool.length === 1 ? 'pregunta' : 'preguntas'} · ${remaining} por salir`
      : `${pool.length} ${pool.length === 1 ? 'pregunta' : 'preguntas'} · Con repeticiones`;
    const exhausted = unique && pool.length > 0 && remaining === 0;
    stage.classList.toggle('is-spinning', animation !== null);
    $('grading').hidden = !isGame() || closedMode() || !pendingTurn;
    $('finish-game').hidden = !isGame() || gameFinished;
    $('finish-game').disabled = pendingTurn || animation !== null || !players.some((player) => player.turns > 0);
    $('reveal').hidden = closedMode() || !hasAnswers() || !currentAnswer || !$('answer').hidden;
    $('spin').setAttribute('aria-disabled', String(!pool.length || exhausted || animation !== null || pendingTurn || gameFinished));
    $('spin-label').textContent = animation !== null ? 'Girando…' : gameFinished ? 'Partida terminada' : exhausted ? 'Ronda completa' : 'Girar ruleta';
    $('reset').disabled = pool.length === 0 && !isGame();
    if (isGame()) renderScoreboard();
  }

  function wheelInk(hex, backdrop, tint = 0) {
    const channels = (color) => {
      const digits = color.slice(1);
      const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
      return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16));
    };
    const background = channels(backdrop);
    const linear = channels(hex).map((channel, index) => {
      const value = (channel * (1 - tint) + background[index] * tint) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    return luminance > .179 ? '#000' : '#fff';
  }

  function updatePalette() {
    const css = getComputedStyle(root);
    const token = (name) => css.getPropertyValue(name).trim();
    const fills = [...'abcdef'].map((letter) => token(`--${letter}`));
    const empty = token('--surface');
    palette = {
      fills,
      highContrast: ['dark', 'light'].includes(root.dataset.contrast),
      edge: token('--wheel-edge'),
      empty,
      clockInk: token('--ink'),
      clockAccent: token('--accent'),
      labels: fills.map((color) => wheelInk(color, empty)),
      usedLabels: fills.map((color) => wheelInk(color, empty, .35))
    };
    wheelNeedsRedraw = true;
    paint();
    drawHourglass();
  }

  function wrapWheelText(question, maxWidth, maxLines) {
    const lines = [];
    let line = '';
    for (const word of question.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (measure.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line && lines.length < maxLines - 1) {
        lines.push(line);
        line = word;
        if (measure.measureText(line).width <= maxWidth) continue;
      }
      const letters = [...(line || word)].slice(0, 200);
      while (letters.length && measure.measureText(`${letters.join('')}…`).width > maxWidth) letters.pop();
      lines.push(`${letters.join('').trimEnd()}…`);
      return lines;
    }
    if (line) lines.push(line);
    return lines;
  }

  function prepareWheelText() {
    wheelNeedsRedraw = true;
    if (!pool.length || $('wheel-labels').value !== 'questions') return;
    const radius = wheelSize / 2 - 2;
    const space = radius * .37 * 2 * Math.sin(Math.PI / Math.max(2, pool.length));
    const fewQuestions = pool.length <= 4;
    const size = fewQuestions ? 40 : Math.min(49, space * .62);
    const maxLines = fewQuestions ? 4 : Math.max(1, Math.min(3, Math.floor(space / (size * 1.16))));
    const family = getComputedStyle(root).getPropertyValue('--display').trim();
    measure.font = `bold ${size}px ${family}`;
    const maxWidth = radius * (fewQuestions ? .58 : .52);
    wheelText = { family, size, lines: pool.map(({ question }) => wrapWheelText(question, maxWidth, maxLines)) };
  }

  function rebuildWheel() {
    const center = wheelSize / 2;
    const radius = center - 2;
    const slice = turn / pool.length;
    const unique = $('no-repeat').checked;
    const showQuestions = $('wheel-labels').value === 'questions';
    const distance = radius * (showQuestions && pool.length <= 4 ? .59 : .65);
    const sectors = document.createDocumentFragment();
    const labels = document.createDocumentFragment();
    wheelLabels = [];
    const point = (radians) => `${center + Math.cos(radians) * radius} ${center + Math.sin(radians) * radius}`;

    for (let index = 0; index < pool.length; index++) {
      const middle = pointerAngle + index * slice;
      const color = index % palette.fills.length;
      const used = unique && drawn.has(index);
      const sector = svg(pool.length === 1 ? 'circle' : 'path');
      if (pool.length === 1) {
        sector.setAttribute('cx', center);
        sector.setAttribute('cy', center);
        sector.setAttribute('r', radius);
      } else {
        sector.setAttribute('d', `M ${center} ${center} L ${point(middle - slice / 2)} A ${radius} ${radius} 0 0 1 ${point(middle + slice / 2)} Z`);
      }
      sector.setAttribute('fill', palette.fills[color]);
      if (used) sector.setAttribute('fill-opacity', '.65');
      if (pool.length > 1 && pool.length <= 60) {
        if (palette.highContrast) {
          const outline = sector.cloneNode();
          outline.setAttribute('fill', 'none');
          outline.setAttribute('stroke', '#000');
          outline.setAttribute('stroke-width', '7');
          sectors.append(sector, outline);
          const highlight = outline.cloneNode();
          highlight.setAttribute('stroke', '#fff');
          highlight.setAttribute('stroke-width', '3');
          sectors.append(highlight);
        } else {
          sector.setAttribute('stroke', palette.edge);
          sector.setAttribute('stroke-width', '3');
          sectors.append(sector);
        }
      } else {
        sectors.append(sector);
      }

      const label = svg('text');
      const size = showQuestions ? wheelText.size : Math.min(80, 1050 / pool.length);
      label.setAttribute('font-size', size);
      label.setAttribute('font-family', showQuestions ? wheelText.family : 'system-ui, sans-serif');
      label.setAttribute('fill', (used ? palette.usedLabels : palette.labels)[color]);
      const lines = showQuestions ? wheelText.lines[index] : [String(index + 1)];
      lines.forEach((line, row) => {
        const text = svg('tspan');
        text.setAttribute('x', '0');
        text.setAttribute('y', (row - (lines.length - 1) / 2) * size * 1.16);
        text.textContent = line;
        label.append(text);
      });
      labels.append(label);
      wheelLabels.push({ label, middle, distance, radial: showQuestions && pool.length > 4 });
    }

    $('wheel-backdrop').setAttribute('fill', palette.empty);
    $('wheel-sectors').replaceChildren(sectors);
    $('wheel-label-layer').replaceChildren(labels);
  }

  function paint() {
    if (wheelNeedsRedraw) {
      rebuildWheel();
      wheelNeedsRedraw = false;
    }
    const center = wheelSize / 2;
    const degrees = (radians) => radians * 180 / Math.PI;
    $('wheel-sectors').setAttribute('transform', `rotate(${degrees(angle)} ${center} ${center})`);
    for (const { label, middle, distance, radial } of wheelLabels) {
      const radians = middle + angle;
      const x = center + Math.cos(radians) * distance;
      const y = center + Math.sin(radians) * distance;
      const rotation = radial ? degrees(radians + (Math.cos(radians) < 0 ? Math.PI : 0)) : 0;
      label.setAttribute('transform', `translate(${x} ${y}) rotate(${rotation})`);
    }
  }

  function prepareSpinAudio() {
    if (!$('wheel-sound').checked) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!wheelAudio) {
        wheelAudio = new AudioContext();
        const sampleRate = wheelAudio.sampleRate;
        tickSound = wheelAudio.createBuffer(1, Math.ceil(sampleRate * .036), sampleRate);
        const samples = tickSound.getChannelData(0);
        for (let index = 0; index < samples.length; index++) {
          const time = index / sampleRate;
          const strike = Math.sin(turn * 670 * time) * .64 + (Math.random() * 2 - 1) * .36;
          const envelope = Math.min(1, time / .0015) * Math.exp(-time * 145);
          samples[index] = strike * envelope * .13;
        }
      }
      if (wheelAudio.state !== 'running') wheelAudio.resume().catch(() => {});
    } catch {
      wheelAudio = null;
      tickSound = null;
    }
  }

  function playSpinTick() {
    if (!tickSound || wheelAudio?.state !== 'running' || !$('wheel-sound').checked) return;
    const tick = wheelAudio.createBufferSource();
    tick.buffer = tickSound;
    tick.connect(wheelAudio.destination);
    tick.onended = () => tick.disconnect();
    tick.start();
  }

  function spin() {
    if ($('spin').getAttribute('aria-disabled') === 'true') return;
    const unique = $('no-repeat').checked;
    const candidates = pool.map((_, index) => index).filter((index) => !unique || !drawn.has(index));
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    stopSpeech();
    stopTimer();
    currentEntry = null;
    currentAnswer = '';
    setAnswerVisible(false);
    $('game-status').textContent = '';
    celebratedTeam = null;
    const target = (turn - winner * turn / pool.length) % turn;
    const finish = () => {
      animation = null;
      angle = target;
      if (unique) drawn.add(winner);
      wheelNeedsRedraw = true;
      paint();
      currentEntry = pool[winner];
      currentAnswer = currentEntry.answer.trim();
      setResult(currentEntry.question.trim());
      pendingTurn = isGame() || (closedMode() && timerEnabled());
      startTimer();
      updateControls();
      if (document.fullscreenElement === stage || stage.classList.contains('projected')) {
        stage.scrollTop = 0;
      }
    };
    if (reducedMotion.matches || $('no-motion').checked) {
      finish();
      return;
    }
    prepareSpinAudio();
    const initial = angle;
    const distance = 4 * turn + (target - initial + turn) % turn;
    const started = performance.now();
    let nextTick = started;
    const step = (now) => {
      const fraction = Math.min(1, Math.max(0, (now - started) / 1900));
      if (fraction === 1 || reducedMotion.matches || $('no-motion').checked) {
        finish();
        return;
      }
      if (now >= nextTick && fraction <= .98) {
        playSpinTick();
        nextTick = now + 45 + 135 * fraction ** 2;
      }
      angle = initial + distance * (1 - (1 - fraction) ** 3);
      paint();
      animation = requestAnimationFrame(step);
    };
    animation = requestAnimationFrame(step);
    updateControls();
  }

  function setAnswerVisible(visible) {
    $('answer').hidden = !visible;
    $('listen-answer').hidden = !visible || !currentAnswer;
    $('answer').textContent = visible ? currentAnswer : '';
    $('reveal').hidden = closedMode() || !hasAnswers() || !currentAnswer || !$('answer').hidden;
  }

  function defaultTeamLabel(index) {
    const style = $('identifiers').value;
    const names = {
      colors: teamColors[index].name,
      letters: 'ABCDEFGH'[index],
      animals: teamAnimals[index].name
    };
    return `Equipo ${names[style] || String(index + 1)}`;
  }

  function playerLabel(index) {
    return isTeamGame() ? defaultTeamLabel(index) : 'Tu puntuación';
  }

  function renderScoreboard() {
    const scores = $('scores');
    const focusedTeam = scores.contains(document.activeElement) ? document.activeElement.dataset.team : undefined;
    const teams = isTeamGame();
    $('scoreboard').toggleAttribute('data-dense', teams && players.length >= 5);
    const columns = players.length <= 4 ? players.length : Math.ceil(players.length / 2);
    scores.style.setProperty('--preferred-team-columns', String(Math.max(1, columns)));
    scores.replaceChildren();
    const ranked = players.map((player, index) => ({ player, index }));
    if (gameFinished) ranked.sort((a, b) => b.player.points - a.player.points || a.index - b.index);
    const locked = gameFinished || pendingTurn || animation !== null;
    for (const { player, index } of ranked) {
      const item = document.createElement('li');
      const card = document.createElement(teams ? 'button' : 'div');
      card.className = 'score';
      card.classList.toggle('celebrate', index === celebratedTeam);
      if (teams) {
        const active = !gameFinished && index === playerIndex;
        card.type = 'button';
        card.dataset.team = index;
        card.classList.toggle('active', active);
        card.setAttribute('aria-pressed', String(active));
        card.setAttribute('aria-disabled', String(locked));
      }

      const name = document.createElement('strong');
      const style = $('identifiers').value;
      if (teams && (style === 'colors' || style === 'animals')) {
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        if (style === 'colors') {
          icon.className = 'team-color';
          icon.style.setProperty('--team-color', teamColors[index].color);
        } else {
          icon.className = 'team-animal';
          icon.textContent = teamAnimals[index].icon;
        }
        name.append(icon);
      }
      const label = playerLabel(index);
      name.append(label);
      if (teams) card.title = label;
      const points = document.createElement('span');
      points.textContent = `${player.points} ${player.points === 1 || player.points === -1 ? 'punto' : 'puntos'}`;
      const streak = document.createElement('span');
      streak.className = 'streak';
      streak.textContent = `Racha ${player.streak}/3`;
      card.append(name, points, streak);
      item.append(card);
      scores.append(item);
      if (teams && focusedTeam === String(index)) card.focus({ preventScroll: true });
    }
    const activeCard = scores.querySelector('.score.active');
    if (activeCard && scores.scrollHeight > scores.clientHeight) {
      const bounds = scores.getBoundingClientRect();
      const cardBounds = activeCard.getBoundingClientRect();
      if (cardBounds.bottom > bounds.bottom) scores.scrollTop += cardBounds.bottom - bounds.bottom;
      if (cardBounds.top < bounds.top) scores.scrollTop -= bounds.top - cardBounds.top;
    }
    $('turn-label').hidden = !teams;
    $('turn-label').textContent = !teams ? '' : gameFinished ? 'Clasificación final'
      : players.length ? `Turno de ${playerLabel(playerIndex)}` : '';
  }

  function configurePlayers() {
    const teams = isTeamGame();
    const count = teams ? Number($('player-count').value) : 1;
    $('team-settings').hidden = !teams;
    players = Array.from({ length: count }, () => ({ points: 0, streak: 0, turns: 0 }));
    playerIndex = 0;
    resetRound();
  }

  function stopTimer() {
    clearTimeout(timerId);
    timerId = null;
    stopSand();
    deadline = null;
    pausedTime = null;
    $('timer-panel').hidden = true;
    $('pause-timer').hidden = true;
    $('timer-panel').removeAttribute('data-paused');
    $('timer-panel').removeAttribute('data-expired');
  }

  function timerSeconds() {
    const input = $('seconds');
    const value = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 30;
    const seconds = Math.max(1, Math.min(600, Math.floor(value)));
    input.value = seconds;
    return seconds;
  }

  function stopSand() {
    if (sandFrame !== null) cancelAnimationFrame(sandFrame);
    sandFrame = null;
  }

  function clockGradient(x1, y1, x2, y2, stops) {
    const gradient = clock.createLinearGradient(x1, y1, x2, y2);
    for (const [offset, color] of stops) gradient.addColorStop(offset, color);
    return gradient;
  }

  function drawHourglass() {
    if (!clock || typeof Path2D !== 'function') return;
    glassChambers ??= [new Path2D(glassShape), new Path2D(glassShape)];
    const highContrast = palette.highContrast;
    const outline = highContrast ? palette.clockInk : palette.clockAccent;
    clock.clearRect(0, 0, clockCanvas.width, clockCanvas.height);

    if (!highContrast) {
      clock.fillStyle = '#0002';
      clock.beginPath();
      clock.ellipse(128, 297, 86, 10, 0, 0, turn);
      clock.fill();
    }

    const glass = highContrast ? palette.empty : clockGradient(53, 0, 203, 0, [
      [0, '#9eb9b5aa'], [.19, '#ffffffea'], [.38, '#ffffff42'], [.73, '#c1dbd5a0'], [.9, '#ffffffde'], [1, '#819d9d99']
    ]);
    const sand = highContrast ? palette.clockInk : clockGradient(58, 0, 198, 0, [
      [0, '#bc7735'], [.33, '#f8cf7e'], [.63, '#e7af54'], [1, '#a66532']
    ]);
    const upperLevel = 162 - Math.sqrt(sandFraction) * 108;
    const lowerLevel = 270 - (1 - sandFraction) ** 1.45 * 105;
    for (const [index, chamber] of glassChambers.entries()) {
      const lower = index === 1;
      const level = lower ? lowerLevel : upperLevel;
      const bottom = lower ? 270 : 162;
      clock.save();
      if (lower) {
        clock.translate(0, 324);
        clock.scale(1, -1);
      }
      clock.clip(chamber);
      if (lower) {
        clock.scale(1, -1);
        clock.translate(0, -324);
      }
      clock.fillStyle = glass;
      clock.fillRect(49, 54, 158, 216);
      clock.fillStyle = sand;
      clock.fillRect(49, level, 158, bottom - level);
      if (!highContrast) {
        clock.fillStyle = '#75492838';
        for (let y = Math.ceil(level / 8) * 8; y < bottom; y += 8) {
          for (let x = 57 + y % 5; x < 204; x += 8) clock.fillRect(x, y, 1.7, 1.7);
        }
        clock.fillStyle = '#ffffff52';
        clock.fillRect(51, level, 154, 2);
      }
      clock.restore();
      clock.strokeStyle = outline;
      clock.lineWidth = highContrast ? 5 : 3.3;
      clock.save();
      if (lower) {
        clock.translate(0, 324);
        clock.scale(1, -1);
      }
      clock.stroke(chamber);
      clock.restore();
    }

    if (deadline !== null && sandFraction > 0) {
      clock.strokeStyle = highContrast ? outline : '#ce9044';
      clock.lineWidth = 2.2;
      clock.beginPath();
      clock.moveTo(128, 162);
      clock.lineTo(128, lowerLevel);
      clock.stroke();
      const flow = (sandFraction * timerDuration / 220) % 1;
      clock.fillStyle = highContrast ? outline : '#f5d489';
      clock.beginPath();
      clock.arc(128, 162 + (lowerLevel - 162) * flow, 2.8, 0, turn);
      clock.fill();
    }

    for (const y of [31, 269]) {
      const metal = highContrast ? outline : clockGradient(0, y, 0, y + 24, [
        [0, '#fff2ce'], [.24, '#e7be73'], [.52, '#a96b34'], [.72, '#e6bc71'], [1, '#7e4c2a']
      ]);
      clock.beginPath();
      if (typeof clock.roundRect === 'function') clock.roundRect(38, y, 180, 24, 8);
      else clock.rect(38, y, 180, 24);
      clock.fillStyle = metal;
      clock.fill();
      clock.strokeStyle = outline;
      clock.lineWidth = 2;
      clock.stroke();
      if (!highContrast) {
        clock.fillStyle = '#fff3d7b3';
        clock.fillRect(57, y + 5, 142, 2);
      }
    }
  }

  function paintSand(remaining) {
    sandFraction = Math.min(1, Math.max(0, remaining / timerDuration));
    drawHourglass();
  }

  function animateSand(now) {
    sandFrame = null;
    if (deadline === null || reducedMotion.matches || $('no-motion').checked) return;
    paintSand(deadline - now);
    if (now < deadline) sandFrame = requestAnimationFrame(animateSand);
  }

  function startSand() {
    if (sandFrame === null && !reducedMotion.matches && !$('no-motion').checked) {
      sandFrame = requestAnimationFrame(animateSand);
    }
  }

  function showTime(milliseconds) {
    paintSand(milliseconds);
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    $('timer-value').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function tickTimer() {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      expireTurn();
      return;
    }
    showTime(remaining);
    const nextSecond = remaining - (Math.ceil(remaining / 1000) - 1) * 1000;
    timerId = setTimeout(tickTimer, Math.max(1, nextSecond));
  }

  function setTimerPauseButton(paused) {
    const button = $('pause-timer');
    const label = paused ? 'Reanudar tiempo' : 'Pausar tiempo';
    button.title = label;
    button.setAttribute('aria-label', label);
    $('pause-icon').textContent = paused ? '▶' : '⏸';
  }

  function startTimer() {
    if (!timerEnabled()) return;
    const duration = timerSeconds();
    timerDuration = duration * 1000;
    deadline = performance.now() + timerDuration;
    setTimerPauseButton(false);
    $('pause-timer').hidden = false;
    $('timer-panel').hidden = false;
    startSand();
    tickTimer();
  }

  function expireTurn() {
    if (closedMode()) finishClosedAnswer(null, $('mode').value === 'binary' ? currentEntry.binaryCorrect : currentEntry.correct);
    else if (isGame()) gradeTurn(false, true);
    else {
      stopTimer();
      showTimerExpired();
    }
  }

  function toggleTimerPause() {
    if (pausedTime !== null) {
      deadline = performance.now() + pausedTime;
      pausedTime = null;
      $('timer-panel').removeAttribute('data-paused');
      setTimerPauseButton(false);
      startSand();
      tickTimer();
      return;
    }
    if (deadline === null) return;
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      expireTurn();
      return;
    }
    clearTimeout(timerId);
    timerId = null;
    deadline = null;
    pausedTime = remaining;
    stopSand();
    showTime(remaining);
    $('timer-panel').setAttribute('data-paused', '');
    setTimerPauseButton(true);
  }

  function finishGame() {
    if (!isGame() || pendingTurn || gameFinished) return '';
    gameFinished = true;
    const best = Math.max(...players.map((player) => player.points));
    const leaders = players.flatMap((player, index) => player.points === best ? [playerLabel(index)] : []);
    updateControls();
    if (!isTeamGame()) return 'Partida terminada.';
    return leaders.length === 1 ? `Gana ${leaders[0]}.` : `Empate: ${leaders.join(', ')}.`;
  }

  function showTimerExpired() {
    paintSand(0);
    $('timer-value').textContent = 'Tiempo agotado';
    $('timer-panel').setAttribute('data-expired', '');
    $('timer-panel').hidden = false;
  }

  function gradeTurn(correct, timedOut = false) {
    if (!pendingTurn) return;
    if (deadline !== null && performance.now() >= deadline) timedOut = true;
    if (timedOut) correct = false;
    const moveFocus = $('grading').contains(document.activeElement) || document.activeElement === $('pause-timer');
    pendingTurn = false;
    stopTimer();
    if (timedOut) showTimerExpired();
    const player = players[playerIndex];
    player.turns++;
    player.streak = correct ? player.streak + 1 : 0;
    const bonus = player.streak === 3;
    if (bonus) player.streak = 0;
    player.points += correct ? (bonus ? 4 : 1) : -1;
    celebratedTeam = correct ? playerIndex : null;
    playerIndex = (playerIndex + 1) % players.length;
    if ($('no-repeat').checked && drawn.size === pool.length) {
      $('game-status').textContent = finishGame();
    } else {
      updateControls();
    }
    if (moveFocus) (gameFinished ? $('reset') : $('spin')).focus();
  }

  function updateMode() {
    if (usingExampleList) questions = examplesForMode();
    const game = isGame();
    $('open-import').hidden = closedMode();
    const quiz = isQuiz();
    $('quiz-import').hidden = !quiz;
    $('quiz-review').hidden = true;
    $('closed-import').hidden = $('mode').value !== 'binary';
    $('notice').textContent = '';
    $('game-settings').hidden = !game;
    $('scoreboard').hidden = !game;
    stage.classList.toggle('is-game', game);
    const resetLabel = game ? 'Reiniciar partida' : 'Reiniciar ronda';
    $('reset').title = resetLabel;
    $('reset').setAttribute('aria-label', resetLabel);
    const answers = hasAnswers();
    const formatHint = answers
      ? 'Numera la pregunta y escribe la respuesta debajo. También puedes poner pregunta / respuesta en la misma línea.'
      : 'Escribe una pregunta por línea. Puedes numerarlas.';
    $('source-help').textContent = `${formatHint} Al importar se sustituye la lista actual.`;
    $('example-below').hidden = !answers;
    $('example-inline').hidden = !answers;
    $('example-questions').hidden = answers;
    renderEditor();
    rebuildPool();
    if (game) configurePlayers();
  }

  function browserVoicePreference(userAgent) {
    const chrome = /(?:Chrome|CriOS)\//.test(userAgent) && !/(?:Edg|OPR|SamsungBrowser)/.test(userAgent);
    if (chrome) return 'google';
    if (/Version\/[^ ]+.*Safari\//.test(userAgent) && !/(?:FxiOS|EdgiOS|OPiOS)/.test(userAgent)) return 'monica';
    return '';
  }

  function voiceName(voice) {
    return voice.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function spanishVoiceOptions(available, userAgent) {
    const preference = browserVoicePreference(userAgent);
    const voices = available.filter((voice) =>
      /^es(?:[-_]ES)?$/i.test(voice.lang));
    const named = voices.filter((voice) => preference && voiceName(voice).includes(preference));
    const automatic = named.find((voice) => /^es-es$/i.test(voice.lang))
      || named[0] || voices.find((voice) => voice.default)
      || voices.find((voice) => voice.localService) || voices[0];
    return { voices, automatic };
  }

  function refreshVoices() {
    const select = $('voice');
    const { voices, automatic } = spanishVoiceOptions(speech?.getVoices() || [], navigator.userAgent);
    const mobile = isAppleMobile();
    const label = automatic && !mobile ? `Automática · ${automatic.name}` : 'Automática · Español de España';
    select.replaceChildren(new Option(label, ''));
    for (const voice of voices) select.add(new Option(`${voice.name} (${voice.lang})`, voice.voiceURI));
    const selected = voices.find((voice) => voice.voiceURI === preferredVoice);
    if (selected) select.value = preferredVoice;
    return selected || automatic;
  }

  function isAppleMobile() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function rulesText() {
    const mode = $('mode').value;
    const scoring = isGame();
    const automatic = closedMode();
    const teams = scoring && isTeamGame();
    const instructions = {
      questions: 'Has elegido Solo preguntas. Pulsa Girar ruleta y responde en voz alta a la pregunta que aparezca.',
      answers: 'Has elegido Preguntas y respuestas. Pulsa Girar ruleta y responde. Después, pulsa Mostrar respuesta para comprobar la solución. Quedará visible hasta el siguiente giro.',
      binary: 'Has elegido Verdadero o falso. Pulsa Girar ruleta, lee la afirmación y toca Verdadero o Falso.',
      quiz: 'Has elegido Tipo test. Pulsa Girar ruleta, lee la pregunta y toca la opción que consideres correcta.'
    };
    const parts = [instructions[mode]];
    if (automatic) {
      parts.push('La solución se marca en verde con un tick. Si eliges una opción incorrecta, se marca en rojo con una cruz.');
    }
    if (scoring) {
      parts.push(teams
        ? `Jugáis con puntos y ${players.length} equipos. Responde el equipo resaltado. Antes de girar, puedes tocar otra tarjeta para cambiar el turno.`
        : 'Juegas en individual con puntos. Tus resultados se anotan en un único marcador.');
      parts.push(automatic
        ? 'La ruleta anota el resultado automáticamente cuando eliges una opción.'
        : 'Marca el tick de más uno si la respuesta es correcta, o la cruz de menos uno si es incorrecta.');
      parts.push('Cada acierto suma un punto. Cada fallo resta un punto y reinicia la racha. Tres aciertos seguidos suman tres puntos extra.');
    }
    if (timerEnabled()) {
      const seconds = timerSeconds();
      parts.push(`El temporizador está activado. Tienes ${seconds === 1 ? 'un segundo' : seconds + ' segundos'} desde que aparece la pregunta. Puedes pausarlo y reanudarlo con el botón del reloj.`);
      if (scoring) {
        parts.push('Si se agota el tiempo, se registra un fallo y se resta un punto.');
      } else {
        parts.push('Si se agota el tiempo, aparece el aviso de Tiempo agotado.');
      }
      if (automatic) parts.push('Al responder o agotarse el tiempo, la ruleta muestra la solución y cierra esa pregunta.');
    } else {
      parts.push('El temporizador está desactivado. Puedes responder a tu ritmo.');
    }
    if (teams) parts.push('Después de cada respuesta o fallo por tiempo, el turno pasa al siguiente equipo.');
    parts.push('Vuelve a pulsar Girar ruleta para continuar.');
    if ($('no-repeat').checked) parts.push('Está activada la opción Sin repeticiones. Cada pregunta sale una sola vez por ronda.');
    return parts.join(' ');
  }

  function updateSpeechControls() {
    const readingQuestion = speakingFrom === 'listen';
    const label = readingQuestion ? 'Detener lectura de la pregunta' : 'Escuchar pregunta';
    $('listen').hidden = !currentQuestion;
    $('listen').setAttribute('aria-label', label);
    $('listen').title = label;
    $('listen-icon').textContent = readingQuestion ? '■' : '🔊';
    $('listen-rules').textContent = speakingFrom === 'rules' ? 'Detener reglas' : 'Escuchar reglas';
    $('listen-answer').textContent = speakingFrom === 'answer' ? '■ Detener respuesta' : '🔊 Escuchar respuesta';
    $('test-voice').textContent = speakingFrom === 'test-voice' ? 'Detener prueba' : 'Probar voz';
  }

  function stopSpeech() {
    clearTimeout(speechStartTimeout);
    clearTimeout(speechPauseTimeout);
    pendingSpeechFrom = '';
    speakingFrom = '';
    if (utterance) {
      utterance = null;
      speech.cancel();
    }
    $('speech-status').textContent = '';
    updateSpeechControls();
  }

  function speak(text, control) {
    const wasSpeaking = speakingFrom === control || pendingSpeechFrom === control;
    stopSpeech();
    if (wasSpeaking || !text) return;
    if (!speech) {
      $('speech-status').textContent = 'Este navegador no ofrece lectura en voz alta.';
      return;
    }
    let parts = (Array.isArray(text) ? text : [text]).filter((part) => part.trim());
    // Keep iOS reading in the original tap, without delayed follow-up utterances.
    if (isAppleMobile()) parts = [parts.map(part => /[.!?…]$/.test(part.trim()) ? part.trim() : `${part.trim()}.`).join(' ')] ;
    if (!parts.length) return;
    let partIndex = 0;
    const voice = refreshVoices();
    const unavailable = 'La lectura no ha podido iniciarse. Vuelve a tocar el botón o elige otra voz en «Elegir voz y velocidad».';
    pendingSpeechFrom = control;

    function read(selectedVoice) {
      const request = new SpeechSynthesisUtterance(parts[partIndex]);
      if (selectedVoice) request.voice = selectedVoice;
      request.lang = 'es-ES';
      request.rate = Number($('rate').value);
      let started = false;
      const finish = (message = '') => {
        if (utterance !== request) return;
        clearTimeout(speechStartTimeout);
        utterance = null;
        pendingSpeechFrom = '';
        speakingFrom = '';
        $('speech-status').textContent = message;
        updateSpeechControls();
      };
      const retry = (cancelPending = false) => {
        if (utterance !== request) return;
        if (!selectedVoice || started) {
          finish(unavailable);
          if (cancelPending) speech.cancel();
          return;
        }
        clearTimeout(speechStartTimeout);
        utterance = null;
        if (cancelPending) speech.cancel();
        read(null);
      };
      request.onstart = () => {
        if (utterance !== request) return;
        started = true;
        pendingSpeechFrom = '';
        speakingFrom = control;
        updateSpeechControls();
        clearTimeout(speechStartTimeout);
      };
      request.onend = () => {
        if (utterance !== request) return;
        if (!started) {
          retry();
          return;
        }
        if (partIndex + 1 === parts.length) {
          finish();
          return;
        }
        utterance = null;
        partIndex++;
        speechPauseTimeout = setTimeout(() => read(selectedVoice), 500);
      };
      request.onerror = () => retry();
      utterance = request;
      speechStartTimeout = setTimeout(() => retry(true), 10000);
      try {
        if (speech.paused) speech.resume();
        speech.speak(request);
      } catch {
        retry();
      }
    }

    read(voice);
  }

  function saveVoicePreferences() {
    try {
      localStorage.setItem('ruleta-lectura', JSON.stringify({ voice: preferredVoice, rate: $('rate').value }));
    } catch {
      // The current selection still works when storage is unavailable.
    }
  }

  function initSpeech() {
    $('rate').value = '1';
    try {
      const saved = JSON.parse(localStorage.getItem('ruleta-lectura'));
      preferredVoice = saved?.voice || '';
    } catch {
      // Keep the default settings if storage is unavailable.
    }
    refreshVoices();
    speech?.addEventListener('voiceschanged', refreshVoices);
  }

  function applyAccessibility() {
    root.style.fontSize = `${textScale}%`;
    $('text-size').value = `${textScale} %`;
    $('smaller-text').disabled = textScale <= 80;
    $('larger-text').disabled = textScale >= 160;
    root.dataset.accessFont = $('access-font').value;
    root.dataset.contrast = $('contrast').value;
    prepareWheelText();
    updatePalette();
  }

  function rememberBank() {
    if (!$('remember-bank').checked) return;
    try {
      localStorage.setItem(bankKey, JSON.stringify({ questions, usingExampleList }));
    } catch {
      $('remember-bank').checked = false;
      $('bank-notice').textContent = 'El navegador no ha podido guardar la lista. Puedes descargarla.';
    }
  }

  function decodeBank(text) {
    const bank = JSON.parse(text);
    if (!Array.isArray(bank?.questions) || !bank.questions.every((entry) =>
      typeof entry?.question === 'string' && typeof entry?.answer === 'string'
      && (entry.options === undefined || (Array.isArray(entry.options)
        && entry.options.every((option) => typeof option === 'string'))))) {
      throw new Error('Lista no válida');
    }
    return bank.questions;
  }

  function downloadBank() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ questions }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lista-ruleta.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setProjected(enabled) {
    stage.classList.toggle('projected', enabled);
    document.body.classList.toggle('projected', enabled);
    syncFullscreen();
  }

  function alignOceanWaves() {
    if (root.dataset.theme !== 'oceano') return;
    const wheel = wheelFrame.getBoundingClientRect();
    const card = stageCard.getBoundingClientRect();
    stageCard.style.setProperty('--wave-start', `${Math.max(0, wheel.bottom - card.top - 43)}px`);
  }

  function syncFullscreen() {
    const active = document.fullscreenElement === stage || stage.classList.contains('projected');
    if (active && toolbar.parentElement !== stage) stage.prepend(toolbar);
    if (!active && toolbar.parentElement === stage) document.body.insertBefore(toolbar, layout);
    settings.inert = active;
    const label = active ? 'Salir de pantalla completa' : 'Pantalla completa';
    $('fullscreen').setAttribute('aria-label', label);
    $('fullscreen').title = label;
    $('fullscreen-icon').textContent = active ? '✕' : '⛶';
    if (active) {
      stage.focus({ preventScroll: true });
      stage.scrollTop = 0;
    } else {
      $('fullscreen').focus({ preventScroll: true });
    }
  }

  async function toggleFullscreen() {
    if (stage.classList.contains('projected')) {
      setProjected(false);
      return;
    }
    if (document.fullscreenElement === stage) {
      await document.exitFullscreen();
      return;
    }
    try {
      if (typeof stage.requestFullscreen !== 'function') {
        setProjected(true);
        return;
      }
      await stage.requestFullscreen();
    } catch {
      setProjected(true);
    }
  }

  function pastedLines(text) {
    return text.trimEnd().split(/\r\n?|\n/).map((line) => line.trim().replace(/^\d+[.)-]\s+/, ''));
  }

  function inlineQuiz(prompt) {
    const separator = prompt.lastIndexOf(' / ');
    const key = separator < 0 ? null : /^([A-Z]+)(?:[.)]|$)/i.exec(prompt.slice(separator + 3).trim());
    if (separator >= 0 && !key) return null;
    const fields = (separator < 0 ? prompt : prompt.slice(0, separator)).split(/\s+([A-Za-z]|[A-Z]{2,})[.)]\s+/);
    const [question, ...pairs] = fields;
    const options = [];
    for (let index = 0; index < pairs.length; index += 2) {
      if (pairs[index].toUpperCase() !== optionLetter(options.length)) return null;
      options.push(pairs[index + 1].trim());
    }
    const correct = key ? options.findIndex((_, index) => optionLetter(index) === key[1].toUpperCase()) : null;
    return question.trim() && options.length >= 2 && (correct === null || options[correct]) && options.every(Boolean)
      ? { question, answer: '', options, correct } : null;
  }

  function parseQuizText(text) {
    const clean = text.trim();
    if (!clean) return [];
    const numbered = /^\d+[.)]\s+/.test(clean);
    const blocks = numbered ? clean.split(/\r?\n(?=[ \t]*\d+[.)][ \t]+)/) : [clean];
    return blocks.map((block) => inlineQuiz(block.trim().replace(/^\d+[.)]\s+/, '').replace(/\s+/g, ' ')));
  }

  let quizDraft = [];
  const clearImportNotice = () => { $('import-notice').textContent = ''; };
  const quizSource = $('quiz-source');

  $('open-question-editor').addEventListener('click', () => {
    clearImportNotice();
    $('question-editor').showModal();
    $(isQuiz() ? 'quiz-source' : closedMode() ? 'closed-questions' : 'source').focus({ preventScroll: true });
    $('question-editor').scrollTop = 0;
  });

  for (const source of [quizSource, $('closed-questions')]) {
    source.addEventListener('input', () => {
      $('quiz-review').hidden = true;
      clearImportNotice();
    });
  }

  function renderQuizDraft() {
    const list = $('quiz-draft-list');
    list.replaceChildren();
    const binary = !isQuiz();
    const solutionKey = binary ? 'binaryCorrect' : 'correct';
    quizDraft.forEach((entry, index) => {
      const group = document.createElement('fieldset');
      group.className = 'quiz-review-card';
      const number = document.createElement('legend');
      number.textContent = `${binary ? 'Afirmación' : 'Pregunta'} ${index + 1}`;
      const question = document.createElement('textarea');
      question.rows = 2;
      question.value = entry.question;
      question.setAttribute('aria-label', `Enunciado de la pregunta ${index + 1}`);
      question.addEventListener('input', () => { entry.question = question.value; clearImportNotice(); });
      const heading = document.createElement('p');
      heading.className = 'quiz-correct-heading hint';
      heading.textContent = 'Correcta';
      group.append(number, question, heading);
      entryOptions(entry).forEach((value, optionIndex) => {
        const row = document.createElement('div');
        row.className = 'quiz-review-option';
        const letter = optionLetter(optionIndex);
        if (binary) {
          row.classList.add('binary-review-option');
          const label = document.createElement('label');
          label.textContent = value;
          label.htmlFor = `quiz-radio-${index}-${optionIndex}`;
          row.append(label);
        } else {
          const label = document.createElement('label');
          label.textContent = `${letter})`;
          const option = document.createElement('input');
          option.type = 'text';
          option.value = value;
          option.id = `quiz-option-${index}-${letter}`;
          option.setAttribute('aria-label', `Opción ${letter} de la pregunta ${index + 1}`);
          label.htmlFor = option.id;
          option.addEventListener('input', () => { entry.options[optionIndex] = option.value; clearImportNotice(); });
          row.append(label, option);
        }
        const correct = document.createElement('input');
        correct.type = 'radio';
        correct.name = `quiz-correct-${index}`;
        correct.id = `quiz-radio-${index}-${optionIndex}`;
        correct.checked = entry[solutionKey] === optionIndex;
        correct.setAttribute('aria-label', binary
          ? `Marcar ${value} como correcta en la afirmación ${index + 1}`
          : `Marcar la opción ${letter} como correcta en la pregunta ${index + 1}`);
        correct.addEventListener('change', () => { entry[solutionKey] = optionIndex; clearImportNotice(); });
        row.append(correct);
        group.append(row);
      });
      list.append(group);
    });
  }

  $('prepare-quiz').addEventListener('click', () => {
    quizDraft = parseQuizText(quizSource.value);
    const invalid = quizDraft.indexOf(null);
    if (!quizDraft.length || invalid !== -1) {
      $('quiz-review').hidden = true;
      $('import-notice').textContent = !quizDraft.length ? 'Pega al menos una pregunta.'
        : `Revisa la pregunta ${invalid + 1}. Escribe al menos dos opciones con letras consecutivas: A), B), C)…`;
      return;
    }
    showClosedReview();
  });

  function showClosedReview() {
    clearImportNotice();
    $('quiz-review-title').textContent = isQuiz() ? 'Marca la respuesta correcta de cada pregunta'
      : 'Marca Verdadero o Falso en cada afirmación';
    renderQuizDraft();
    $('quiz-review').hidden = false;
    $('quiz-review-title').focus();
  }

  $('save-quiz-draft').addEventListener('click', () => {
    if ($('quiz-review').hidden) return;
    const binary = !isQuiz();
    const solutionKey = binary ? 'binaryCorrect' : 'correct';
    const invalid = quizDraft.findIndex((entry) =>
      !entry.question.trim() || entryOptions(entry).some((option) => !option.trim())
      || !Number.isInteger(entry[solutionKey]));
    if (invalid !== -1) {
      $('import-notice').textContent = binary
        ? `Revisa la afirmación ${invalid + 1}. Completa la frase y marca Verdadero o Falso.`
        : `Revisa la pregunta ${invalid + 1}. Completa el enunciado y las opciones, y marca la correcta.`;
      $('quiz-draft-list').children[invalid].querySelector('input[type="radio"]').focus();
      return;
    }
    questions = binary ? quizDraft : [...(usingExampleList ? [] : questions), ...quizDraft];
    usingExampleList = false;
    $('notice').textContent = `${binary ? 'Afirmaciones importadas' : 'Preguntas añadidas'}: ${quizDraft.length}.`;
    quizDraft = [];
    $('quiz-draft-list').replaceChildren();
    $('quiz-review').hidden = true;
    (binary ? $('closed-questions') : quizSource).value = '';
    $('question-editor').close();
    renderEditor();
    rebuildPool();
  });

  function parseBinaryText(text) {
    return pastedLines(text).filter(Boolean).map((line) => {
      const key = /\s*\/\s*(V(?:erdadero)?|F(?:also)?)[.!]?$/i.exec(line);
      return {
        question: key ? line.slice(0, key.index).trim() : line,
        answer: '',
        binaryCorrect: key ? Number(key[1][0].toUpperCase() === 'F') : null
      };
    });
  }

  $('build-closed').addEventListener('click', () => {
    const entries = parseBinaryText($('closed-questions').value);
    if (!entries.length || entries.some(({ question }) => !question)) {
      $('import-notice').textContent = 'Escribe al menos una afirmación, una por línea.';
      return;
    }
    quizDraft = entries;
    showClosedReview();
  });

  $('import').addEventListener('click', () => {
    const imported = parseEntries($('source').value);
    if (!imported.length) {
      $('import-notice').textContent = 'Pega al menos una pregunta.';
      return;
    }
    questions = imported;
    usingExampleList = false;
    renderEditor();
    rebuildPool();
    $('question-editor').close();
    $('notice').textContent = imported.length === 1 ? '1 pregunta importada.' : `${imported.length} preguntas importadas.`;
  });
  $('add').addEventListener('click', () => {
    questions.push({ question: '', answer: '' });
    renderEditor();
    $('question-list').lastElementChild.querySelector('textarea').focus();
  });
  $('no-repeat').addEventListener('change', resetRound);
  $('reset').addEventListener('click', () => {
    if (isGame()) configurePlayers();
    else resetRound();
  });
  $('mode').addEventListener('change', updateMode);
  $('load-examples').addEventListener('click', () => {
    $('remember-bank').checked = false;
    usingExampleList = true;
    updateMode();
  });
  $('scoring-enabled').addEventListener('change', updateMode);
  $('player-count').addEventListener('change', configurePlayers);
  $('game-type').addEventListener('change', configurePlayers);
  $('scores').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-team]');
    if (!button || !isGame() || pendingTurn || animation !== null || gameFinished) return;
    playerIndex = Number(button.dataset.team);
    $('game-status').textContent = '';
    renderScoreboard();
  });
  $('identifiers').addEventListener('change', () => {
    renderScoreboard();
  });
  $('timed').addEventListener('change', () => {
    $('time-settings').hidden = !timerEnabled();
    if (!currentEntry || animation !== null || $('closed-choices').dataset.answered
      || (isGame() && !pendingTurn) || (!isGame() && !$('answer').hidden)) return;
    pendingTurn = isGame() || (closedMode() && timerEnabled());
    if (timerEnabled()) startTimer();
    else stopTimer();
    updateControls();
  });
  $('pause-timer').addEventListener('click', toggleTimerPause);
  $('seconds').addEventListener('change', timerSeconds);
  $('reveal').addEventListener('click', () => {
    if (!isGame()) stopTimer();
    setAnswerVisible(true);
    $('answer').focus({ preventScroll: true });
  });
  $('correct').addEventListener('click', () => gradeTurn(true));
  $('incorrect').addEventListener('click', () => gradeTurn(false));
  $('finish-game').addEventListener('click', () => {
    $('game-status').textContent = finishGame();
    $('reset').focus();
  });
  $('no-motion').addEventListener('change', () => root.toggleAttribute('data-no-motion', $('no-motion').checked));
  $('spin').addEventListener('click', spin);
  function updateTopic() {
    const topic = $('topic').value.trim();
    $('stage-topic').textContent = topic ? ` ${topic}` : '…';
    document.title = topic ? `A vueltas con ${topic}` : 'A vueltas con… · Ruleta test';
    $('stage-title').title = document.title;
  }

  $('topic').addEventListener('input', updateTopic);
  $('theme').addEventListener('change', (event) => {
    root.dataset.theme = event.target.value;
    alignOceanWaves();
    updatePalette();
  });
  $('font').addEventListener('change', (event) => {
    root.dataset.font = event.target.value;
    prepareWheelText();
    paint();
  });
  $('wheel-labels').addEventListener('change', () => {
    prepareWheelText();
    paint();
  });
  $('smaller-text').addEventListener('click', () => {
    textScale -= 10;
    applyAccessibility();
  });
  $('larger-text').addEventListener('click', () => {
    textScale += 10;
    applyAccessibility();
  });
  for (const id of ['access-font', 'contrast']) $(id).addEventListener('change', applyAccessibility);
  $('reset-access').addEventListener('click', () => {
    textScale = 100;
    $('access-font').value = 'original';
    $('contrast').value = 'original';
    $('no-motion').checked = false;
    root.removeAttribute('data-no-motion');
    applyAccessibility();
  });
  $('save-bank').addEventListener('click', downloadBank);
  async function openBank(event) {
    const [file] = event.currentTarget.files;
    if (!file) return;
    const fromMode = event.currentTarget.id === 'open-bank-in-mode';
    event.currentTarget.value = '';
    const notice = $(fromMode ? 'import-notice' : 'bank-notice');
    const mode = $('mode').value;
    try {
      const content = await file.text();
      if (fromMode && (!$('question-editor').open || $('mode').value !== mode)) return;
      if (fromMode && /\.txt$/i.test(file.name)) {
        const source = $(isQuiz() ? 'quiz-source' : closedMode() ? 'closed-questions' : 'source');
        source.value = content;
        $('quiz-review').hidden = true;
        notice.textContent = isQuiz() || closedMode()
          ? 'Texto cargado. Pulsa Continuar para revisar las soluciones.'
          : 'Texto cargado. Pulsa Importar preguntas.';
        source.focus();
        return;
      }
      const opened = decodeBank(content);
      if (fromMode && opened.length && (isQuiz() ? !opened.some((entry) => entry.options?.length >= 2)
        : mode === 'binary' && !opened.some((entry) => Number.isInteger(entry.binaryCorrect)))) {
        notice.textContent = 'Esta lista no contiene soluciones para el modo seleccionado. Abre una lista de este modo o carga un archivo de texto.';
        return;
      }
      questions = opened;
      usingExampleList = false;
      renderEditor();
      rebuildPool();
      const message = `Lista abierta · ${pool.length} ${pool.length === 1 ? 'pregunta' : 'preguntas'}.`;
      if (fromMode) {
        $('quiz-review').hidden = true;
        $('question-editor').close();
        $('notice').textContent = message;
      } else {
        notice.textContent = message;
      }
    } catch {
      notice.textContent = 'No se pudo abrir la lista. Comprueba que el archivo tenga el formato indicado.';
    }
  }

  for (const id of ['open-bank', 'open-bank-in-mode']) $(id).addEventListener('change', openBank);
  $('open-remembered-bank').addEventListener('click', () => {
    try {
      const saved = localStorage.getItem(bankKey);
      if (!saved) {
        $('bank-notice').textContent = 'Todavía no hay una lista guardada en este navegador.';
        return;
      }
      const opened = decodeBank(saved);
      questions = opened;
      usingExampleList = false;
      $('remember-bank').checked = true;
      renderEditor();
      rebuildPool();
      $('bank-notice').textContent = 'Lista del navegador abierta. Selecciona el modo correspondiente a tu lista.';
    } catch {
      $('bank-notice').textContent = 'No se ha podido abrir la lista guardada en este navegador.';
    }
  });

  $('remember-bank').addEventListener('change', () => {
    if ($('remember-bank').checked) {
      rememberBank();
      return;
    }
    try {
      localStorage.removeItem(bankKey);
    } catch {
      $('bank-notice').textContent = 'El navegador no ha podido borrar su copia de la lista.';
    }
  });
  const guide = $('guide');
  $('open-guide').addEventListener('click', () => {
    if (!guide.open) guide.showModal();
  });
  $('listen-rules').addEventListener('click', () => speak(rulesText(), 'rules'));
  $('listen').addEventListener('click', () => {
    const parts = [currentQuestion];
    if (closedMode() && currentEntry) {
      entryOptions(currentEntry).forEach((answer, index) => {
        if (!answer.trim()) return;
        parts.push(isQuiz() ? `Opción ${optionLetter(index)}.` : `Opción ${index + 1}.`, answer);
      });
    }
    speak(parts, 'listen');
  });
  $('listen-answer').addEventListener('click', () => {
    const solution = closedMode() && currentEntry
      ? entryOptions(currentEntry)[isQuiz() ? currentEntry.correct : currentEntry.binaryCorrect]
      : currentAnswer;
    speak(solution || '', 'answer');
  });
  $('test-voice').addEventListener('click', () => speak('Así se escucharán las preguntas de la ruleta.', 'test-voice'));
  $('voice').addEventListener('change', () => {
    preferredVoice = $('voice').value;
    saveVoicePreferences();
  });
  $('rate').addEventListener('change', saveVoicePreferences);
  $('fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || guide.open) return;
    const menu = document.querySelector('.stage-tools details[open]');
    if (menu) {
      menu.open = false;
      menu.querySelector('summary').focus();
      event.preventDefault();
      return;
    }
    if (stage.classList.contains('projected')) setProjected(false);
  });
  for (const id of ['accessibility', 'voice-menu']) {
    $(id).addEventListener('toggle', () => {
      if ($(id).open) $(id === 'voice-menu' ? 'accessibility' : 'voice-menu').open = false;
    });
  }
  if ('ResizeObserver' in window) {
    const waveObserver = new ResizeObserver(alignOceanWaves);
    for (const element of [stageCard, wheelFrame, stage.querySelector('.stage-top')]) waveObserver.observe(element);
  }
  function syncLayoutOrder() {
    const settingsFirst = layout.firstElementChild === settings;
    if (settingsFirst !== mobileLayout.matches) return;
    const focused = settings.contains(document.activeElement) ? document.activeElement : null;
    if (mobileLayout.matches) layout.append(settings);
    else layout.prepend(settings);
    focused?.focus({ preventScroll: true });
  }

  mobileLayout.addEventListener('change', syncLayoutOrder);
  syncLayoutOrder();
  updateTopic();
  questions = examplesForMode();
  usingExampleList = true;
  pool = questions.filter((entry) => entry.question.trim());
  applyAccessibility();
  rebuildPool();
  updateMode();
  initSpeech();
})();
