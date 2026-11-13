(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const stage = $('stage');
  const stageCard = stage.querySelector('.stage-card');
  const wheelFrame = $('wheel-frame');
  const toolbar = $('main-toolbar');
  const layout = document.querySelector('.layout');
  const canvas = $('wheel');
  const ctx = canvas.getContext('2d');
  const clockCanvas = $('hourglass');
  const clock = clockCanvas.getContext('2d');
  const upperGlass = new Path2D('M57 54 C56 96 70 116 103 139 C116 148 121 154 123 162 L133 162 C135 154 140 148 153 139 C186 116 200 96 199 54 Z');
  const lowerGlass = new Path2D();
  lowerGlass.addPath(upperGlass, new DOMMatrix([1, 0, 0, -1, 0, 324]));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const turn = Math.PI * 2;
  const pointerAngle = -Math.PI / 2;

  const exampleQuestions = [
    ['¿Qué roca forma la corteza oceánica?', 'El basalto.'],
    ['¿Por qué puede flotar la pumita?', 'Porque tiene baja densidad.'],
    ['¿Qué roca es un vidrio volcánico negro y compacto?', 'La obsidiana.']
  ];
  let questions = exampleQuestions.map(([question, answer]) => ({ question, answer }));
  let pool = [];
  const drawn = new Set();
  let angle = 0;
  let animation = null;
  let wheelAudio = null;
  let tickSound = null;
  let palette;
  let wheelText = { lines: [], font: '', size: 0 };
  let currentQuestion = '';
  const speech = 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null;
  let utterance = null;
  let speakingFrom = '';
  let preferredVoice = '';
  let textScale = 100;
  const bankKey = 'ruleta-lista-1';
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

  const isGame = () => $('mode').value === 'game';
  const isTeamGame = () => $('game-type').value === 'team';
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
      if (hasAnswers()) {
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
    pool = questions.filter((entry) => entry.question.trim());
    $('total').textContent = pool.length;
    rememberBank();
    prepareWheelText();
    resetRound();
  }

  function setResult(value) {
    if (currentQuestion !== value && speakingFrom === 'listen') stopSpeech();
    currentQuestion = value;
    updateSpeechControls();
    $('question').textContent = value;
    $('result').hidden = !value;
    $('question-announcement').textContent = value;
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
    celebratedTeam = null;
    angle = 0;
    setResult('');
    paint();
    updateControls();
  }

  function updateControls() {
    const unique = $('no-repeat').checked;
    const remaining = pool.length - drawn.size;
    $('progress').textContent = !pool.length ? 'Sin preguntas en la ruleta' : unique
      ? `${pool.length} ${pool.length === 1 ? 'pregunta' : 'preguntas'} · ${remaining} por salir`
      : `${pool.length} ${pool.length === 1 ? 'pregunta' : 'preguntas'} · Con repeticiones`;
    const exhausted = unique && pool.length > 0 && remaining === 0;
    stage.classList.toggle('is-spinning', animation !== null);
    $('grading').hidden = !isGame() || !pendingTurn;
    $('finish-game').hidden = !isGame() || gameFinished;
    $('finish-game').disabled = pendingTurn || animation !== null || !players.some((player) => player.turns > 0);
    $('reveal').hidden = !hasAnswers() || !currentAnswer || !$('answer').hidden;
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
      highContrast: root.dataset.contrast !== 'original',
      edge: token('--wheel-edge'),
      empty,
      clockInk: token('--ink'),
      clockAccent: token('--accent'),
      labels: fills.map((color) => wheelInk(color, empty)),
      usedLabels: fills.map((color) => wheelInk(color, empty, .35))
    };
    paint();
    drawHourglass();
  }

  function wrapWheelText(question, maxWidth, maxLines) {
    const lines = [];
    let line = '';
    for (const word of question.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line && lines.length < maxLines - 1) {
        lines.push(line);
        line = word;
        if (ctx.measureText(line).width <= maxWidth) continue;
      }
      const letters = [...(line || word)].slice(0, 200);
      while (letters.length && ctx.measureText(`${letters.join('')}…`).width > maxWidth) letters.pop();
      lines.push(`${letters.join('').trimEnd()}…`);
      return lines;
    }
    if (line) lines.push(line);
    return lines;
  }

  function prepareWheelText() {
    if (!pool.length || $('wheel-labels').value !== 'questions') return;
    const radius = canvas.width / 2 - 2;
    const space = radius * .37 * 2 * Math.sin(Math.PI / Math.max(2, pool.length));
    const fewQuestions = pool.length <= 4;
    const size = fewQuestions ? 40 : Math.min(49, space * .62);
    const maxLines = fewQuestions ? 4 : Math.max(1, Math.min(3, Math.floor(space / (size * 1.16))));
    const family = getComputedStyle(root).getPropertyValue('--display').trim();
    const font = `bold ${size}px ${family}`;
    ctx.font = font;
    const maxWidth = radius * (fewQuestions ? .58 : .52);
    wheelText = { font, size, lines: pool.map(({ question }) => wrapWheelText(question, maxWidth, maxLines)) };
  }

  function drawWheelLabel(index, middle, center, radius, showQuestions) {
    const distance = radius * (showQuestions && pool.length <= 4 ? .59 : .65);
    const x = center + Math.cos(middle) * distance;
    const y = center + Math.sin(middle) * distance;
    if (!showQuestions) {
      ctx.font = `bold ${Math.min(80, 1050 / pool.length)}px system-ui, sans-serif`;
      ctx.fillText(String(index + 1), x, y);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    if (pool.length > 4) ctx.rotate(Math.cos(middle) < 0 ? middle + Math.PI : middle);
    ctx.font = wheelText.font;
    const lines = wheelText.lines[index];
    lines.forEach((line, row) => {
      ctx.fillText(line, 0, (row - (lines.length - 1) / 2) * wheelText.size * 1.16);
    });
    ctx.restore();
  }

  function paint() {
    const center = canvas.width / 2;
    const radius = center - 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!pool.length) {
      ctx.fillStyle = palette.empty;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const slice = turn / pool.length;
    const first = pointerAngle + angle - slice / 2;
    const unique = $('no-repeat').checked;
    const showQuestions = $('wheel-labels').value === 'questions';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < pool.length; index++) {
      const start = first + index * slice;
      const color = index % palette.fills.length;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = palette.fills[color];
      ctx.fill();
      const used = unique && drawn.has(index);
      if (used) {
        ctx.save();
        ctx.globalAlpha = .35;
        ctx.fillStyle = palette.empty;
        ctx.fill();
        ctx.restore();
      }
      if (pool.length > 1 && pool.length <= 60) {
        if (palette.highContrast) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.strokeStyle = '#fff';
        } else {
          ctx.strokeStyle = palette.edge;
        }
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = (used ? palette.usedLabels : palette.labels)[color];
      drawWheelLabel(index, start + slice / 2, center, radius, showQuestions);
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
      paint();
      currentEntry = pool[winner];
      currentAnswer = currentEntry.answer.trim();
      setResult(currentEntry.question.trim());
      if (isGame()) {
        pendingTurn = true;
        startTimer();
      }
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
    $('answer').textContent = visible ? currentAnswer : '';
    $('reveal').hidden = !hasAnswers() || !currentAnswer || !$('answer').hidden;
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
    for (const [chamber, level, bottom] of [[upperGlass, upperLevel, 162], [lowerGlass, lowerLevel, 270]]) {
      clock.save();
      clock.clip(chamber);
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
      clock.stroke(chamber);
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
      clock.roundRect(38, y, 180, 24, 8);
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
      gradeTurn(false, true);
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
    if (!$('timed').checked) return;
    const duration = timerSeconds();
    timerDuration = duration * 1000;
    deadline = performance.now() + timerDuration;
    setTimerPauseButton(false);
    $('pause-timer').hidden = false;
    $('timer-panel').hidden = false;
    startSand();
    tickTimer();
  }

  function toggleTimerPause() {
    if (!pendingTurn) return;
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
      gradeTurn(false, true);
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

  function gradeTurn(correct, timedOut = false) {
    if (!pendingTurn) return;
    if (deadline !== null && performance.now() >= deadline) timedOut = true;
    if (timedOut) correct = false;
    const moveFocus = $('grading').contains(document.activeElement) || document.activeElement === $('pause-timer');
    pendingTurn = false;
    stopTimer();
    if (timedOut) {
      paintSand(0);
      $('timer-value').textContent = 'Tiempo agotado';
      $('timer-panel').setAttribute('data-expired', '');
      $('pause-timer').hidden = true;
      $('timer-panel').hidden = false;
    }
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
    const game = isGame();
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
    if (game) configurePlayers();
    else resetRound();
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
      /^es-ES$/i.test(voice.lang) && (voice.localService || (preference === 'google' && /\bgoogle\b/i.test(voice.name))));
    const named = voices.filter((voice) => preference && voiceName(voice).includes(preference));
    const automatic = named.find((voice) => /^es-es$/i.test(voice.lang))
      || named[0] || voices.find((voice) => voice.default)
      || voices.find((voice) => /^es-es$/i.test(voice.lang)) || voices[0];
    return { voices, automatic };
  }

  function refreshVoices() {
    const select = $('voice');
    const { voices, automatic } = spanishVoiceOptions(speech?.getVoices() || [], navigator.userAgent);
    const label = automatic ? `Automática · ${automatic.name}` : 'Sin voces disponibles de español de España';
    select.replaceChildren(new Option(label, ''));
    for (const voice of voices) select.add(new Option(`${voice.name} (${voice.lang})`, voice.voiceURI));
    const selected = voices.find((voice) => voice.voiceURI === preferredVoice);
    if (selected) select.value = preferredVoice;
    return selected || automatic;
  }

  function rulesText() {
    const mode = $('mode').value;
    const draw = 'Pulsa Girar ruleta. Cuando aparezca la pregunta, responde en voz alta.';
    if (mode === 'questions') return draw;
    const reveal = 'Pulsa Mostrar respuesta para ver la solución. Quedará visible hasta el siguiente giro.';
    if (mode === 'answers') return `${draw} ${reveal}`;

    const teams = isTeamGame();
    const participation = teams
      ? `Pueden jugar de dos a ocho equipos. En esta partida hay ${players.length}. Responde el equipo resaltado. Antes de girar, puedes tocar la tarjeta de otro equipo para darle el turno.`
      : 'Esta partida es individual. Responde las preguntas para sumar puntos en tu marcador.';
    let timer = '';
    if ($('timed').checked) {
      const seconds = timerSeconds();
      const time = seconds === 1 ? 'un segundo' : `${seconds} segundos`;
      timer = `Cuando aparece la pregunta, tienes ${time} para responder. Usa el icono de pausa para detener el reloj mientras valoras la respuesta. Si se agota el tiempo, se registra un fallo automáticamente.`;
    }
    const scoring = 'Marca el botón de más uno si la respuesta es correcta y el de menos uno si es incorrecta. El acierto suma un punto. El fallo resta un punto y corta la racha.';
    const streak = teams
      ? 'Tres aciertos seguidos del mismo equipo suman tres puntos extra.'
      : 'Tres aciertos seguidos suman tres puntos extra.';
    const next = teams
      ? 'El turno pasa al siguiente equipo. Al final gana quien tenga más puntos.'
      : 'Después de marcar el resultado, vuelve a girar para seguir jugando.';
    return [participation, draw, timer, reveal, scoring, streak, next].filter(Boolean).join(' ');
  }

  function updateSpeechControls() {
    const readingQuestion = speakingFrom === 'listen';
    const label = readingQuestion ? 'Detener lectura de la pregunta' : 'Escuchar pregunta';
    $('listen').hidden = !currentQuestion;
    $('listen').setAttribute('aria-label', label);
    $('listen').title = label;
    $('listen-icon').textContent = readingQuestion ? '■' : '🔊';
    $('listen-rules').textContent = speakingFrom === 'rules' ? 'Detener reglas' : 'Escuchar reglas';
    $('test-voice').textContent = speakingFrom === 'test-voice' ? 'Detener prueba' : 'Probar voz';
  }

  function stopSpeech() {
    if (utterance) {
      utterance = null;
      speakingFrom = '';
      speech.cancel();
    }
    $('speech-status').textContent = '';
    updateSpeechControls();
  }

  function speak(text, control) {
    const wasSpeaking = speakingFrom === control;
    stopSpeech();
    if (wasSpeaking || !text) return;
    if (!speech) {
      $('speech-status').textContent = 'Este navegador no ofrece lectura en voz alta.';
      return;
    }
    const voice = refreshVoices();
    if (!voice) {
      $('speech-status').textContent = 'No hay voces de español de España disponibles en este dispositivo.';
      return;
    }
    const request = new SpeechSynthesisUtterance(text);
    request.voice = voice;
    request.lang = voice.lang;
    request.rate = Number($('rate').value);
    const finish = (message = '') => {
      if (utterance !== request) return;
      utterance = null;
      speakingFrom = '';
      $('speech-status').textContent = message;
      updateSpeechControls();
    };
    request.onend = () => finish();
    request.onerror = () => finish('No se ha podido reproducir la voz seleccionada.');
    utterance = request;
    speakingFrom = control;
    updateSpeechControls();
    try {
      speech.speak(request);
    } catch {
      finish('No se ha podido reproducir la voz seleccionada.');
    }
  }

  function saveVoicePreferences() {
    try {
      localStorage.setItem('ruleta-lectura', JSON.stringify({ voice: preferredVoice, rate: $('rate').value }));
    } catch {
      // The current selection still works when storage is unavailable.
    }
  }

  function initSpeech() {
    try {
      const saved = JSON.parse(localStorage.getItem('ruleta-lectura'));
      preferredVoice = saved?.voice || '';
      if (['0.65', '0.9', '1', '1.1'].includes(saved?.rate)) $('rate').value = saved.rate;
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
      localStorage.setItem(bankKey, JSON.stringify({ questions }));
    } catch {
      $('remember-bank').checked = false;
      $('bank-notice').textContent = 'El navegador no ha podido guardar la lista. Puedes descargarla.';
    }
  }

  function decodeBank(text) {
    const bank = JSON.parse(text);
    if (!Array.isArray(bank?.questions) || !bank.questions.every((entry) =>
      typeof entry?.question === 'string' && typeof entry?.answer === 'string')) {
      throw new Error('Lista no válida');
    }
    return bank.questions;
  }

  function restoreBank() {
    try {
      const saved = localStorage.getItem(bankKey);
      if (saved === null) return;
      questions = decodeBank(saved);
      $('remember-bank').checked = true;
    } catch {
      // Use the example list when there is no readable saved list.
    }
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
    document.querySelector('.settings').inert = active;
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

  $('import').addEventListener('click', () => {
    const imported = parseEntries($('source').value);
    if (!imported.length) {
      $('notice').textContent = 'Pega al menos una pregunta.';
      return;
    }
    questions = imported;
    renderEditor();
    rebuildPool();
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
    $('time-settings').hidden = !$('timed').checked;
    if (!pendingTurn) return;
    if ($('timed').checked) startTimer();
    else stopTimer();
  });
  $('pause-timer').addEventListener('click', toggleTimerPause);
  $('seconds').addEventListener('change', timerSeconds);
  $('reveal').addEventListener('click', () => {
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
    $('stage-topic').textContent = topic ? ` ${topic}` : '';
    $('stage-topic').hidden = !topic;
    document.title = topic ? `A vueltas con ${topic}` : 'A vueltas con';
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
  $('open-bank').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    event.target.value = '';
    try {
      questions = decodeBank(await file.text());
      renderEditor();
      rebuildPool();
      $('bank-notice').textContent = `Lista abierta · ${pool.length} ${pool.length === 1 ? 'pregunta' : 'preguntas'}.`;
    } catch {
      $('bank-notice').textContent = 'No se pudo abrir la lista. Elige un archivo descargado desde la ruleta.';
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
  $('listen').addEventListener('click', () => speak(currentQuestion, 'listen'));
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
  updateTopic();
  initSpeech();
  restoreBank();
  applyAccessibility();
  rebuildPool();
  updateMode();
})();
