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
    showSide: "front",
  },
};

const elements = {
  tabs: document.querySelectorAll(".tab-button"),
  contents: document.querySelectorAll(".tab-content"),
  deckList: document.getElementById("deck-list"),
  deckMeta: document.getElementById("deck-meta"),
  cardList: document.getElementById("card-list"),
  createDeck: document.getElementById("create-deck"),
  newCard: document.getElementById("new-card"),
  cardForm: document.getElementById("card-form"),
  cardFront: document.getElementById("card-front"),
  cardBack: document.getElementById("card-back"),
  frontImage: document.getElementById("front-image"),
  backImage: document.getElementById("back-image"),
  imagePreview: document.getElementById("image-preview"),
  deleteCard: document.getElementById("delete-card"),
  studyDeck: document.getElementById("study-deck"),
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
        color: "#8b5cf6",
        tags: ["語彙", "TOEIC"],
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
    const tags = clone.querySelector(".deck-tags");
    const count = clone.querySelector(".deck-count");
    const selectBtn = clone.querySelector(".select-deck");
    const deleteBtn = clone.querySelector(".delete-deck");

    title.textContent = deck.name;
    tags.textContent = deck.tags.length ? `タグ: ${deck.tags.join(" / ")}` : "タグ: なし";
    count.textContent = `カード数: ${deck.cards.length}`;
    card.style.borderColor = deck.color;
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
    elements.deckMeta.textContent = "カードの束を選択してください。";
    return;
  }

  const total = deck.cards.length;
  const pending = deck.cards.filter((card) => card.attempts === 0).length;
  const lowScore = deck.cards.filter((card) => card.correctCount === 0 && card.attempts > 0)
    .length;
  elements.deckMeta.innerHTML = `
    <strong>${deck.name}</strong> / 色: <span style="color:${deck.color}">${deck.color}</span><br />
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
  elements.studyStatus.textContent = card
    ? `現在: ${deck.name} / 正解 ${card.correctCount} / 不正解 ${card.wrongCount} / 残りカード ${remaining}`
    : `現在: ${deck.name} / カードがありません`;
};

const pickNextCard = (deck) => {
  if (!deck || deck.cards.length === 0) return null;
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
    elements.cardStage.innerHTML = "カードの束を選択してください。";
    return;
  }
  const card = deck.cards.find((item) => item.id === state.study.currentCardId);
  if (!card) {
    elements.cardStage.innerHTML = "カードがありません。ホーム画面で追加してください。";
    return;
  }

  const isFront = state.study.showSide === "front";
  const content = isFront ? card.front : card.back;
  const image = isFront ? card.frontImage : card.backImage;
  elements.cardStage.innerHTML = `
    <h3>${isFront ? "表" : "裏"}</h3>
    <p>${content || "(内容が空です)"}</p>
    ${image ? `<img src="${image}" alt="${isFront ? "表" : "裏"}画像" />` : ""}
  `;
};

const startStudySession = () => {
  const deck = findDeck(state.study.deckId);
  if (!deck) return;
  const next = pickNextCard(deck);
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

elements.createDeck.addEventListener("click", () => {
  const name = prompt("カードの束の名前を入力してください");
  if (!name) return;
  const tagsInput = prompt("タグをカンマ区切りで入力してください (任意)", "");
  const color = prompt("色を入力してください (例: #3b82f6)", "#3b82f6");
  const tags = tagsInput
    ? tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];
  const newDeck = {
    id: uid(),
    name,
    color: color || "#3b82f6",
    tags,
    cards: [],
  };
  state.decks.push(newDeck);
  state.selectedDeckId = newDeck.id;
  saveState();
  render();
});

elements.newCard.addEventListener("click", () => {
  state.editingCardId = null;
  resetCardForm();
});

elements.cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const deck = findDeck(state.selectedDeckId);
  if (!deck) {
    alert("カードの束を選択してください。");
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

elements.startStudy.addEventListener("click", () => {
  state.study.deckId = elements.studyDeck.value;
  state.study.direction = document.querySelector("input[name='direction']:checked").value;
  startStudySession();
});

elements.flipCard.addEventListener("click", () => {
  state.study.showSide = state.study.showSide === "front" ? "back" : "front";
  renderStudyCard();
});

elements.markCorrect.addEventListener("click", () => handleStudyResult(true));

elements.markWrong.addEventListener("click", () => handleStudyResult(false));
