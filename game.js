const FILE_RETICOLO = "reticolo_stradale.csv";
const FILE_PERCORSO = "percorso.csv";
const FILE_INCROCI = "incroci.csv";
const FILE_DOMANDE = "domande.csv";
const FILE_TABELLONE = "tabellone.png";
const CARTELLA_IMMAGINI = "immagini";

const COLORS = {
  white: "#ffffff",
  black: "#000000",
  blue: "#3c78dc",
  gold: "#f4c542",
  orange: "#ea7a20",
  shadow: "rgba(0, 0, 0, 0.28)",
  routeOuter: "rgba(0, 0, 0, 0.28)",
  routeInner: "rgba(60, 120, 220, 0.9)",
};

const BOARD_WIDTH = 1000;
const PLAYER_RADIUS = 14;
const MOVE_DURATION_MS = 180;
const TIME_LIMIT_MS = 3 * 60 * 1000;

const boardCanvas = document.getElementById("boardCanvas");
const ctx = boardCanvas.getContext("2d");

const livesEl = document.getElementById("lives");
const positionEl = document.getElementById("position");
const questionTextEl = document.getElementById("questionText");
const questionImageWrapEl = document.getElementById("questionImageWrap");
const questionImageEl = document.getElementById("questionImage");
const messageEl = document.getElementById("message");
const trueButton = document.getElementById("trueButton");
const falseButton = document.getElementById("falseButton");
const restartButton = document.getElementById("restartButton");
const timerLabelEl = document.getElementById("timerLabel");
const timerBarEl = document.getElementById("timerBar");

let boardImage;
let boardHeight = 0;
let gridWidth = 0;
let gridHeight = 0;
let cellWidth = 0;
let cellHeight = 0;

let percorso = [];
let incroci = [];
let domande = [];
let tappe = [];
let arrivo = null;

let vite = 3;
let numeroTappa = 0;
let posizione = null;
let indicePercorsoAttuale = 0;
let indicePercorsoArrivo = 0;
let staMuovendo = false;
let giocoFinito = false;
let domandaAttuale = null;
let messaggio = "Rispondi alla domanda.";
let ultimaTransizione = 0;
let playerDrawPosition = null;
let startTime = 0;
let remainingTimeMs = TIME_LIMIT_MS;

async function loadGame() {
  try {
    const [reticoloText, percorsoText, incrociText, domandeText, image] = await Promise.all([
      fetchText(FILE_RETICOLO, "utf-8"),
      fetchText(FILE_PERCORSO, "windows-1252"),
      fetchText(FILE_INCROCI, "windows-1252"),
      fetchText(FILE_DOMANDE, "windows-1252"),
      loadImage(FILE_TABELLONE),
    ]);

    const reticolo = parseGrid(reticoloText);
    percorso = parsePointRows(percorsoText);
    incroci = parsePointRows(incrociText);
    domande = parseQuestions(domandeText);
    boardImage = image;

    gridHeight = reticolo.length;
    gridWidth = reticolo[0]?.length ?? 0;
    boardHeight = Math.round(boardImage.height * (BOARD_WIDTH / boardImage.width));
    boardCanvas.width = BOARD_WIDTH;
    boardCanvas.height = boardHeight;
    cellWidth = BOARD_WIDTH / gridWidth;
    cellHeight = boardHeight / gridHeight;

    const incrociSet = new Set(incroci.map(toKey));
    tappe = percorso.filter((cella) => incrociSet.has(toKey(cella)));
    arrivo = tappe[tappe.length - 1];

    restartGame();
    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    questionTextEl.textContent =
      "Impossibile caricare il gioco. Apri la cartella con un server locale, per esempio `python -m http.server`.";
    messageEl.textContent = "Controlla anche che tutti i CSV e le immagini siano presenti.";
    setButtonsEnabled(false);
  }
}

function restartGame() {
  vite = 3;
  numeroTappa = 0;
  posizione = tappe[0];
  playerDrawPosition = { ...posizione };
  indicePercorsoAttuale = percorso.findIndex((cella) => equalsPoint(cella, posizione));
  indicePercorsoArrivo = indicePercorsoAttuale;
  staMuovendo = false;
  giocoFinito = false;
  domandaAttuale = randomQuestion();
  messaggio = "Rispondi alla domanda.";
  ultimaTransizione = 0;
  startTime = performance.now();
  remainingTimeMs = TIME_LIMIT_MS;
  restartButton.classList.add("hidden");
  setButtonsEnabled(true);
  renderPanel();
  draw();
}

function loop(timestamp) {
  updateTimer(timestamp);

  if (staMuovendo) {
    if (!ultimaTransizione) {
      ultimaTransizione = timestamp;
    }

    if (timestamp - ultimaTransizione >= MOVE_DURATION_MS) {
      advanceMovement();
      ultimaTransizione = timestamp;
    } else {
      updateInterpolatedPosition((timestamp - ultimaTransizione) / MOVE_DURATION_MS);
    }
  } else {
    ultimaTransizione = 0;
    if (posizione) {
      playerDrawPosition = { ...posizione };
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function advanceMovement() {
  const previousIndex = indicePercorsoAttuale;

  if (indicePercorsoAttuale < indicePercorsoArrivo) {
    indicePercorsoAttuale += 1;
  } else if (indicePercorsoAttuale > indicePercorsoArrivo) {
    indicePercorsoAttuale -= 1;
  } else {
    staMuovendo = false;
  }

  posizione = percorso[indicePercorsoAttuale];
  playerDrawPosition = interpolatePoint(
    percorso[previousIndex],
    posizione,
    1,
  );
  renderPanel();
}

function updateInterpolatedPosition(progress) {
  const direction = Math.sign(indicePercorsoArrivo - indicePercorsoAttuale);

  if (direction === 0) {
    playerDrawPosition = { ...posizione };
    return;
  }

  const nextIndex = indicePercorsoAttuale + direction;
  const nextPoint = percorso[nextIndex];
  playerDrawPosition = interpolatePoint(posizione, nextPoint, progress);
}

function handleAnswer(rispostaData) {
  if (giocoFinito || staMuovendo || !domandaAttuale) {
    return;
  }

  const rispostaCorretta = domandaAttuale.risposta;

  if (rispostaData === rispostaCorretta) {
    numeroTappa += 1;

    if (numeroTappa === tappe.length) {
      indicePercorsoArrivo = percorso.findIndex((cella) => equalsPoint(cella, arrivo));
      staMuovendo = true;
      giocoFinito = true;
      messaggio = "Hai vinto!";
      restartButton.classList.remove("hidden");
      setButtonsEnabled(false);
    } else {
      const nuovaPosizione = tappe[numeroTappa];
      indicePercorsoArrivo = percorso.findIndex((cella) => equalsPoint(cella, nuovaPosizione));
      staMuovendo = true;
      messaggio = "Risposta corretta!";
      domandaAttuale = randomQuestion();
    }
  } else {
    vite -= 1;
    numeroTappa = Math.max(0, numeroTappa - 1);

    const nuovaPosizione = tappe[numeroTappa];
    indicePercorsoArrivo = percorso.findIndex((cella) => equalsPoint(cella, nuovaPosizione));
    staMuovendo = true;

    if (vite === 0) {
      messaggio = "Game over!";
      giocoFinito = true;
      restartButton.classList.remove("hidden");
      setButtonsEnabled(false);
    } else {
      messaggio = "Risposta sbagliata! Torni indietro.";
      domandaAttuale = randomQuestion();
    }
  }

  renderPanel();
}

function updateTimer(timestamp) {
  if (!startTime) {
    return;
  }

  if (giocoFinito) {
    renderTimer();
    return;
  }

  remainingTimeMs = Math.max(0, TIME_LIMIT_MS - (timestamp - startTime));

  if (remainingTimeMs === 0) {
    giocoFinito = true;
    messaggio = "Tempo scaduto! Game over!";
    restartButton.classList.remove("hidden");
    setButtonsEnabled(false);
    renderPanel();
  } else {
    renderTimer();
  }
}

function renderPanel() {
  livesEl.textContent = `Vite: ${vite}`;
  positionEl.textContent = posizione ? `Posizione: (${posizione.x}, ${posizione.y})` : "Posizione: -";
  questionTextEl.textContent = domandaAttuale?.testo ?? "";
  messageEl.textContent = messaggio;
  setButtonsEnabled(!staMuovendo && !giocoFinito);
  renderTimer();

  const nomeImmagine = domandaAttuale?.immagine?.trim();
  if (nomeImmagine) {
    questionImageEl.src = `${CARTELLA_IMMAGINI}/${encodeURIComponent(nomeImmagine)}`;
    questionImageEl.alt = `Immagine associata alla domanda ${domandaAttuale.id}`;
    questionImageWrapEl.classList.remove("hidden");
  } else {
    questionImageEl.removeAttribute("src");
    questionImageWrapEl.classList.add("hidden");
  }
}

function renderTimer() {
  const ratio = Math.max(0, Math.min(1, remainingTimeMs / TIME_LIMIT_MS));
  timerBarEl.style.width = `${ratio * 100}%`;

  if (ratio > 0.5) {
    timerBarEl.style.backgroundColor = "var(--green)";
  } else if (ratio > 0.25) {
    timerBarEl.style.backgroundColor = "var(--yellow)";
  } else {
    timerBarEl.style.backgroundColor = "var(--red)";
  }

  timerLabelEl.textContent = `Tempo rimanente: ${formatTime(remainingTimeMs)}`;
}

function draw() {
  if (!boardImage) {
    return;
  }

  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.drawImage(boardImage, 0, 0, boardCanvas.width, boardCanvas.height);

  const pathPoints = percorso.map(toScreenPoint);
  drawPath(pathPoints);

  if (pathPoints.length > 0) {
    drawMarker(pathPoints[0], "P", COLORS.blue);
    drawMarker(pathPoints[pathPoints.length - 1], "A", COLORS.orange);
  }

  if (playerDrawPosition) {
    drawPlayer(toScreenPoint(playerDrawPosition));
  }
}

function drawPath(points) {
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 8;

  ctx.strokeStyle = COLORS.routeOuter;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLORS.routeInner;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();

  for (const point of points) {
    ctx.fillStyle = COLORS.blue;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer(point) {
  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.black;
  ctx.beginPath();
  ctx.arc(point.x, point.y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.black;
  ctx.beginPath();
  ctx.arc(point.x, point.y, PLAYER_RADIUS + 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(point.x, point.y, PLAYER_RADIUS - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.black;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawMarker(point, label, fillColor) {
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.black;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = COLORS.white;
  ctx.font = "700 12px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, point.x, point.y + 1);
  ctx.restore();
}

function toScreenPoint({ x, y }) {
  return {
    x: x * cellWidth + cellWidth / 2,
    y: (gridHeight - y - 1) * cellHeight + cellHeight / 2,
  };
}

function parsePointRows(csvText) {
  const rows = parseCsv(csvText, ";");
  return rows.slice(1).map((row) => ({
    x: Number.parseInt(row[0], 10),
    y: Number.parseInt(row[1], 10),
  }));
}

function parseQuestions(csvText) {
  const rows = parseCsv(csvText, ";");
  return rows.slice(1).map((row) => ({
    id: row[0],
    testo: row[1],
    risposta: row[2].trim().toUpperCase() === "VERO",
    immagine: row[3] ?? "",
  }));
}

function parseGrid(csvText) {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => line.split(","));
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

async function fetchText(path, encoding) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Errore nel caricamento di ${path}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder(encoding);
  return decoder.decode(buffer);
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Impossibile caricare l'immagine ${path}`));
    image.src = path;
  });
}

function randomQuestion() {
  return domande[Math.floor(Math.random() * domande.length)];
}

function toKey({ x, y }) {
  return `${x},${y}`;
}

function equalsPoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

function interpolatePoint(from, to, progress) {
  if (!from || !to) {
    return to ?? from ?? null;
  }

  const clamped = Math.max(0, Math.min(1, progress));
  return {
    x: from.x + (to.x - from.x) * clamped,
    y: from.y + (to.y - from.y) * clamped,
  };
}

function formatTime(timeMs) {
  const totalSeconds = Math.ceil(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setButtonsEnabled(enabled) {
  trueButton.disabled = !enabled;
  falseButton.disabled = !enabled;
}

trueButton.addEventListener("click", () => handleAnswer(true));
falseButton.addEventListener("click", () => handleAnswer(false));
restartButton.addEventListener("click", restartGame);
questionImageEl.addEventListener("error", () => {
  questionImageWrapEl.classList.add("hidden");
});

loadGame();
