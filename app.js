const STORAGE_KEY = "word-card-data";

const state = {
  decks: [],
  selectedDeckId: null,
  editingCardId: null,
  pendingImages: {
    front: null,
    back: null,
  },
  study: {
    deckId: null,
    currentCardId: null,
    direction: "front",
    mode: "normal",
    showSide: "front",
    sessionWrongIds: [],
    lastWrongByDeck: {},
  },
};

const elements = {
  tabs: document.querySelectorAll(".tab-button"),
  contents: document.querySelectorAll(".tab-content"),
  deckList: document.getElementById("deck-list"),
  deckMeta: document.getElementById("deck-meta"),
  cardList: document.getElementById("card-list"),
  createDeck: document.getElementById("create-deck"),
  deckForm: document.getElementById("deck-form"),
  deckName: document.getElementById("deck-name"),
  newCard: document.getElementById("new-card"),
  cardForm: document.getElementById("card-form"),
  cardFront: document.getElementById("card-front"),
  cardBack: document.getElementById("card-back"),
  frontImage: document.getElementById("front-image"),
  backImage: document.getElementById("back-image"),
  imagePreview: document.getElementById("image-preview"),
  deleteCard: document.getElementById("delete-card"),
  resetProgress: document.getElementById("reset-progress"),
  sheetUrl: document.getElementById("sheet-url"),
  importSheet: document.getElementById("import-sheet"),
  studyDeck: document.getElementById("study-deck"),
  studyMode: document.getElementById("study-mode"),
  startStudy: document.getElementById("start-study"),
  studySession: document.getElementById("study-session"),
  cardStage: document.getElementById("card-stage"),
  flipCard: document.getElementById("flip-card"),
  markCorrect: document.getElementById("mark-correct"),
  markWrong: document.getElementById("mark-wrong"),
  studyStatus: document.getElementById("study-status"),
};

const deckTemplate = document.getElementById("deck-template");
const cardItemTemplate = document.getElementById("card-item-template");

const uid = () => Math.random().toString(36).slice(2, 10);

const normalizeSheetUrl = (url) => {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  return url;
};

const parseCsv = (text) => {
  const rows = [];
  let current = "";
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current || row.length) {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && next === "\n") {
        i += 1;
      }
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
};

const mapCsvRowsToCards = (rows) => {
  if (!rows.length) return [];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = header.includes("front") || header.includes("back");
  const startIndex = hasHeader ? 1 : 0;
  const columnIndex = {
    front: header.indexOf("front"),
    back: header.indexOf("back"),
    frontImage: header.indexOf("frontimage"),
    backImage: header.indexOf("backimage"),
  };

  return rows.slice(startIndex).map((row) => {
    const front = hasHeader ? row[columnIndex.front] : row[0];
    const back = hasHeader ? row[columnIndex.back] : row[1];
    const frontImage = hasHeader ? row[columnIndex.frontImage] : row[2];
    const backImage = hasHeader ? row[columnIndex.backImage] : row[3];

    return {
      id: uid(),
      front: front?.trim() || "",
      back: back?.trim() || "",
      frontImage: frontImage?.trim() || null,
      backImage: backImage?.trim() || null,
      correctCount: 0,
      wrongCount: 0,
      attempts: 0,
    };
  }).filter((card) => card.front || card.back);
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.decks));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state.decks = JSON.parse(raw);
    } catch (error) {
      console.error("Failed to parse storage", error);
    }
  }

  if (state.decks.length === 0) {
    state.decks = [
      {
        id: uid(),
        name: "英単語",
        cards: [
          {
            id: uid(),
            front: "accelerate",
            back: "加速する",
            frontImage: null,
            backImage: null,
            correctCount: 0,
            wrongCount: 0,
            attempts: 0,
          },
          {
            id: uid(),
            front: "reinforce",
            back: "強化する",
            frontImage: null,
            backImage: null,
            correctCount: 1,
            wrongCount: 0,
            attempts: 1,
          },
        ],
      },
    ];
  }

  state.selectedDeckId = state.decks[0]?.id ?? null;
};

const updateTabs = (tabName) => {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  elements.contents.forEach((content) => {
    content.classList.toggle("active", content.id === tabName);
  });
};

const findDeck = (id) => state.decks.find((deck) => deck.id === id);

const updateDeckSelect = () => {
  elements.studyDeck.innerHTML = "";
  state.decks.forEach((deck) => {
    const option = document.createElement("option");
    option.value = deck.id;
    option.textContent = deck.name;
    elements.studyDeck.appendChild(option);
  });
  if (state.selectedDeckId) {
    elements.studyDeck.value = state.selectedDeckId;
  }
};

const renderDecks = () => {
  elements.deckList.innerHTML = "";
  state.decks.forEach((deck) => {
    const clone = deckTemplate.content.cloneNode(true);
    const card = clone.querySelector(".deck-card");
    const title = clone.querySelector("h3");
    const count = clone.querySelector(".deck-count");
    const selectBtn = clone.querySelector(".select-deck");
    const deleteBtn = clone.querySelector(".delete-deck");

    title.textContent = deck.name;
    count.textContent = `カード数: ${deck.cards.length}`;
    if (deck.id === state.selectedDeckId) {
      card.classList.add("selected");
    }

    selectBtn.addEventListener("click", () => {
      state.selectedDeckId = deck.id;
      state.editingCardId = null;
      resetCardForm();
      render();
    });

    deleteBtn.addEventListener("click", () => {
      if (!confirm(`${deck.name} を削除しますか？`)) return;
      state.decks = state.decks.filter((item) => item.id !== deck.id);
      if (state.selectedDeckId === deck.id) {
        state.selectedDeckId = state.decks[0]?.id ?? null;
      }
      state.editingCardId = null;
      saveState();
      render();
    });

    elements.deckList.appendChild(clone);
  });
};

const renderDeckMeta = () => {
  const deck = findDeck(state.selectedDeckId);
  if (!deck) {
    elements.deckMeta.textContent = "デッキを選択してください。";
    return;
  }

  const pending = deck.cards.filter((card) => card.attempts === 0).length;
  const lowScore = deck.cards.filter((card) => card.correctCount === 0 && card.attempts > 0)
    .length;
  elements.deckMeta.innerHTML = `
    <strong>${deck.name}</strong><br />
    未実施: ${pending} / 正解回数0: ${lowScore}
  `;
};

const renderCards = () => {
  elements.cardList.innerHTML = "";
  const deck = findDeck(state.selectedDeckId);
  if (!deck) return;

  deck.cards.forEach((card) => {
    const clone = cardItemTemplate.content.cloneNode(true);
    clone.querySelector("h4").textContent = card.front || "(表が空です)";
    clone.querySelector(".card-back").textContent = card.back || "(裏が空です)";
    clone.querySelector(".card-stats").textContent =
      `正解 ${card.correctCount} / 不正解 ${card.wrongCount}`;

    clone.querySelector(".edit-card").addEventListener("click", () => {
      state.editingCardId = card.id;
      elements.cardFront.value = card.front;
      elements.cardBack.value = card.back;
      state.pendingImages.front = card.frontImage;
      state.pendingImages.back = card.backImage;
      renderImagePreview();
    });

    elements.cardList.appendChild(clone);
  });
};

const renderImagePreview = () => {
  elements.imagePreview.innerHTML = "";
  if (state.pendingImages.front) {
    const img = document.createElement("img");
    img.src = state.pendingImages.front;
    img.alt = "表画像";
    elements.imagePreview.appendChild(img);
  }
  if (state.pendingImages.back) {
    const img = document.createElement("img");
    img.src = state.pendingImages.back;
    img.alt = "裏画像";
    elements.imagePreview.appendChild(img);
  }
};

const resetCardForm = () => {
  elements.cardFront.value = "";
  elements.cardBack.value = "";
  elements.frontImage.value = "";
  elements.backImage.value = "";
  state.pendingImages.front = null;
  state.pendingImages.back = null;
  renderImagePreview();
};

const renderStudyStatus = () => {
  const deck = findDeck(state.study.deckId);
  if (!deck) {
    elements.studyStatus.textContent = "";
    return;
  }
  const card = deck.cards.find((item) => item.id === state.study.currentCardId);
  const remaining = deck.cards.length;
  const modeLabel = {
    normal: "通常モード",
    weak: "苦手モード",
    random: "ランダムモード",
  }[state.study.mode];
  elements.studyStatus.textContent = card
    ? `現在: ${deck.name} / ${modeLabel} / 正解 ${card.correctCount} / 不正解 ${card.wrongCount} / 残りカード ${remaining}`
    : `現在: ${deck.name} / ${modeLabel} / カードがありません`;
};

const pickRandomCard = (cards) => {
  if (!cards.length) return null;
  const index = Math.floor(Math.random() * cards.length);
  return cards[index];
};

const pickNextCard = (deck, mode) => {
  if (!deck || deck.cards.length === 0) return null;
  if (mode === "random") {
    return pickRandomCard(deck.cards);
  }

  if (mode === "weak") {
    const lastWrongIds = state.study.lastWrongByDeck[deck.id] ?? [];
    const wrongCards = deck.cards.filter((card) => lastWrongIds.includes(card.id));
    return wrongCards.length ? pickRandomCard(wrongCards) : null;
  }

  const sorted = [...deck.cards].sort((a, b) => {
    const untriedA = a.attempts === 0 ? -1 : 0;
    const untriedB = b.attempts === 0 ? -1 : 0;
    if (untriedA !== untriedB) return untriedA - untriedB;
    if (a.correctCount !== b.correctCount) return a.correctCount - b.correctCount;
    return a.wrongCount - b.wrongCount;
  });
  return sorted[0];
};

const renderStudyCard = () => {
  const deck = findDeck(state.study.deckId);
  if (!deck) {
    elements.cardStage.innerHTML = "デッキを選択してください。";
    return;
  }
  const card = deck.cards.find((item) => item.id === state.study.currentCardId);
  if (!card) {
    const message =
      state.study.mode === "weak"
        ? "不正解のカードはありません。"
        : "カードがありません。ホーム画面で追加してください。";
    elements.cardStage.innerHTML = message;
    return;
  }

  const isFront = state.study.showSide === "front";
  const content = isFront ? card.front : card.back;
  const image = isFront ? card.frontImage : card.backImage;
  elements.cardStage.innerHTML = `
    <p>${content || "(内容が空です)"}</p>
    ${image ? `<img src="${image}" alt="カード画像" />` : ""}
  `;
};

const startStudySession = () => {
  const deck = findDeck(state.study.deckId);
  if (!deck) return;
  if (state.study.mode !== "weak" && state.study.sessionWrongIds.length) {
    state.study.lastWrongByDeck[state.study.deckId] = [...state.study.sessionWrongIds];
  }
  state.study.sessionWrongIds = [];
  const next = pickNextCard(deck, state.study.mode);
  state.study.currentCardId = next?.id ?? null;
  state.study.showSide = state.study.direction;
  renderStudyCard();
  renderStudyStatus();
};

const handleStudyResult = (isCorrect) => {
  const deck = findDeck(state.study.deckId);
  if (!deck) return;
  const card = deck.cards.find((item) => item.id === state.study.currentCardId);
  if (!card) return;
  card.attempts += 1;
  if (isCorrect) {
    card.correctCount += 1;
  } else {
    card.wrongCount += 1;
    if (!state.study.sessionWrongIds.includes(card.id)) {
      state.study.sessionWrongIds.push(card.id);
    }
  }
  if (state.study.mode === "weak") {
    const wrongIds = state.study.lastWrongByDeck[state.study.deckId] ?? [];
    if (isCorrect) {
      state.study.lastWrongByDeck[state.study.deckId] = wrongIds.filter((id) => id !== card.id);
    } else if (!wrongIds.includes(card.id)) {
      state.study.lastWrongByDeck[state.study.deckId] = [...wrongIds, card.id];
    }
  }
  saveState();
  renderCards();
  startStudySession();
};

const render = () => {
  renderDecks();
  renderDeckMeta();
  renderCards();
  updateDeckSelect();
  elements.studyMode.value = state.study.mode;
  renderStudyCard();
  renderStudyStatus();
};

const init = () => {
  loadState();
  updateTabs("home");
  render();
};

init();

// Event listeners

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => updateTabs(tab.dataset.tab));
});

const handleCreateDeck = () => {
  const name = elements.deckName.value.trim();
  if (!name) {
    alert("デッキ名を入力してください。");
    return;
  }
  const newDeck = {
    id: uid(),
    name,
    cards: [],
  };
  state.decks.push(newDeck);
  state.selectedDeckId = newDeck.id;
  elements.deckName.value = "";
  saveState();
  render();
};

elements.deckForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCreateDeck();
});

elements.newCard.addEventListener("click", () => {
  state.editingCardId = null;
  resetCardForm();
});

elements.cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const deck = findDeck(state.selectedDeckId);
  if (!deck) {
    alert("デッキを選択してください。");
    return;
  }
  const front = elements.cardFront.value.trim();
  const back = elements.cardBack.value.trim();
  if (!front && !back) {
    alert("表か裏のどちらかを入力してください。");
    return;
  }
  if (state.editingCardId) {
    const card = deck.cards.find((item) => item.id === state.editingCardId);
    if (card) {
      card.front = front;
      card.back = back;
      card.frontImage = state.pendingImages.front;
      card.backImage = state.pendingImages.back;
    }
  } else {
    deck.cards.push({
      id: uid(),
      front,
      back,
      frontImage: state.pendingImages.front,
      backImage: state.pendingImages.back,
      correctCount: 0,
      wrongCount: 0,
      attempts: 0,
    });
  }

  state.editingCardId = null;
  resetCardForm();
  saveState();
  render();
});

elements.deleteCard.addEventListener("click", () => {
  const deck = findDeck(state.selectedDeckId);
  if (!deck) return;
  if (!state.editingCardId) {
    alert("削除するカードを選択してください。");
    return;
  }
  deck.cards = deck.cards.filter((card) => card.id !== state.editingCardId);
  state.editingCardId = null;
  resetCardForm();
  saveState();
  render();
});

elements.resetProgress.addEventListener("click", () => {
  const deck = findDeck(state.selectedDeckId);
  if (!deck) {
    alert("デッキを選択してください。");
    return;
  }
  if (!confirm(`${deck.name} の学習状況をリセットしますか？`)) return;
  deck.cards.forEach((card) => {
    card.correctCount = 0;
    card.wrongCount = 0;
    card.attempts = 0;
  });
  saveState();
  render();
});

elements.frontImage.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingImages.front = reader.result;
    renderImagePreview();
  };
  reader.readAsDataURL(file);
});

elements.backImage.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingImages.back = reader.result;
    renderImagePreview();
  };
  reader.readAsDataURL(file);
});

elements.importSheet.addEventListener("click", async () => {
  const deck = findDeck(state.selectedDeckId);
  if (!deck) {
    alert("デッキを選択してください。");
    return;
  }
  const url = elements.sheetUrl.value.trim();
  if (!url) {
    alert("スプレッドシートのリンクを入力してください。");
    return;
  }

  try {
    const response = await fetch(normalizeSheetUrl(url));
    if (!response.ok) {
      throw new Error("Failed to load sheet");
    }
    const text = await response.text();
    const rows = parseCsv(text);
    const cards = mapCsvRowsToCards(rows);
    if (!cards.length) {
      alert("読み込めるカードがありませんでした。");
      return;
    }
    deck.cards.push(...cards);
    elements.sheetUrl.value = "";
    saveState();
    render();
  } catch (error) {
    console.error(error);
    alert("スプレッドシートの読み込みに失敗しました。公開設定を確認してください。");
  }
});

elements.startStudy.addEventListener("click", () => {
  state.study.deckId = elements.studyDeck.value;
  state.study.direction = document.querySelector("input[name='direction']:checked").value;
  state.study.mode = elements.studyMode.value;
  startStudySession();
});

elements.flipCard.addEventListener("click", () => {
  state.study.showSide = state.study.showSide === "front" ? "back" : "front";
  renderStudyCard();
});

elements.markCorrect.addEventListener("click", () => handleStudyResult(true));

elements.markWrong.addEventListener("click", () => handleStudyResult(false));
