(() => {
  "use strict";

  const TOTAL_QUESTIONS = 100;
  const QUESTIONS_PER_ROUND = 5;
  const ROUND_SECONDS = 75;
  const MIDTERM_IDS = new Set([
    "003", "004", "005", "006", "019", "025", "030", "031", "034", "041", "046", "053", "054", "058", "059", "076", "077",
    "007", "008", "009", "012", "018", "021", "032", "033", "045", "060", "065", "069", "070", "075", "082", "106", "108",
    "014", "016", "022", "024", "026", "039", "042", "068", "071", "081", "085", "086", "125", "138", "146", "150", "173",
    "015", "056", "061", "062", "083", "152", "157", "160", "178", "183", "185", "193", "194", "195", "196", "207", "217",
    "035", "036", "047", "052", "057", "087", "092", "094", "099", "100", "117", "118", "120", "123", "133", "139", "154",
    "028", "048", "073", "078", "084", "089", "134", "136", "153", "174", "176", "179", "181", "192", "206", "222", "231",
    "110", "124", "155", "163", "164", "166", "200", "220", "235", "244", "247", "272", "278", "286", "297", "305", "317",
    "109", "135", "137", "140", "158", "159", "162", "169", "177", "187", "198", "268", "270", "292", "304", "326", "334",
    "184", "188", "189", "212", "215", "216", "223", "224", "225", "241", "257", "266", "267", "269", "275", "303", "309",
    "221", "229", "239", "249", "258", "259", "260", "263", "274", "282", "283", "294", "296", "318", "338", "340",
    "197", "203", "204", "209", "245", "246", "250", "273", "295", "307", "311", "313", "315", "316", "324", "327", "337",
    "233", "236", "237", "240", "251", "255", "264", "276", "281", "287", "288", "291", "302", "310", "312", "325", "330",
  ]);

  const elements = {
    home: document.querySelector("#home-screen"),
    quiz: document.querySelector("#quiz-screen"),
    break: document.querySelector("#break-screen"),
    result: document.querySelector("#result-screen"),
    galleryCount: document.querySelector("#gallery-count"),
    startError: document.querySelector("#start-error"),
    questionNumber: document.querySelector("#question-number"),
    roundQuestion: document.querySelector("#round-question"),
    roundLabel: document.querySelector("#round-label"),
    roundQuestions: document.querySelector("#round-questions"),
    answerForm: document.querySelector("#answer-form"),
    submitButton: document.querySelector("#submit-button"),
    answerHint: document.querySelector("#answer-hint"),
    feedback: document.querySelector("#feedback"),
    nextButton: document.querySelector("#next-button"),
    timerDisplay: document.querySelector("#timer-display"),
    timerCard: document.querySelector(".timer-card"),
    timerBar: document.querySelector("#timer-bar"),
    timerTrack: document.querySelector(".timer-track"),
    scoreLabel: document.querySelector("#score-label"),
    scoreValue: document.querySelector("#score-value"),
    correctCount: document.querySelector("#correct-count"),
    progressValue: document.querySelector("#progress-value"),
    progressBar: document.querySelector("#progress-bar"),
    progressTotal: document.querySelector("#progress-total"),
    sessionSummary: document.querySelector("#session-summary"),
    quitButton: document.querySelector("#quit-button"),
    breakTitle: document.querySelector("#break-title"),
    breakDescription: document.querySelector("#break-description"),
    roundScore: document.querySelector("#round-score"),
    breakTotalScore: document.querySelector("#break-total-score"),
    continueButton: document.querySelector("#continue-button"),
    finalScore: document.querySelector("#final-score"),
    finalCorrect: document.querySelector("#final-correct"),
    finalRounds: document.querySelector("#final-rounds"),
    restartButton: document.querySelector("#restart-button"),
    reviewCount: document.querySelector("#review-count"),
    reviewEmpty: document.querySelector("#review-empty"),
    reviewList: document.querySelector("#review-list"),
  };

  const gallery = Array.isArray(window.HERB_QUESTIONS) ? window.HERB_QUESTIONS : [];
  let questions = [];
  let roundStartIndex = 0;
  let score = 0;
  let correctCount = 0;
  let roundCorrect = 0;
  let roundDeadline = 0;
  let timerId = null;
  let roundSubmitted = false;
  let reviewItems = [];
  let selectedExam = "midterm";
  let totalQuestions = 0;
  let examQuestions = [];

  elements.galleryCount.textContent = String(gallery.length);

  function showScreen(screen) {
    [elements.home, elements.quiz, elements.break, elements.result].forEach((item) => {
      item.hidden = item !== screen;
    });
  }

  function shuffle(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function normalizeAnswer(value) {
    return value.normalize("NFC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  }

  function isCorrectAnswer(value, question) {
    const answer = normalizeAnswer(value);
    if (!answer) return false;
    const accepted = [question.answer, ...(question.aliases || [])];
    return accepted.some((candidate) => normalizeAnswer(candidate) === answer);
  }

  function currentRoundNumber() {
    return Math.floor(roundStartIndex / QUESTIONS_PER_ROUND) + 1;
  }

  function updateScore() {
    elements.scoreValue.textContent = String(score);
    elements.scoreLabel.textContent = `得分 ${score}`;
    elements.correctCount.innerHTML = `${correctCount} <small>/ ${totalQuestions}</small>`;
    const completed = Math.min(roundStartIndex + (roundSubmitted ? QUESTIONS_PER_ROUND : 0), totalQuestions);
    const percentage = Math.round((completed / totalQuestions) * 100);
    elements.progressValue.textContent = `${percentage}%`;
    elements.progressBar.style.width = `${percentage}%`;
    elements.progressTotal.textContent = `${totalQuestions} 題`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  }

  function updateTimer() {
    const milliseconds = Math.max(0, roundDeadline - Date.now());
    const seconds = Math.ceil(milliseconds / 1000);
    elements.timerDisplay.textContent = formatTime(seconds);
    elements.timerBar.style.width = `${(milliseconds / (ROUND_SECONDS * 1000)) * 100}%`;
    elements.timerTrack.setAttribute("aria-valuenow", String(seconds));
    elements.timerCard.classList.toggle("is-low", seconds <= 15);
    if (milliseconds <= 0) submitRound(true);
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startRoundTimer() {
    stopTimer();
    roundDeadline = Date.now() + ROUND_SECONDS * 1000;
    updateTimer();
    timerId = window.setInterval(updateTimer, 200);
  }

  function renderRound() {
    const roundQuestions = questions.slice(roundStartIndex, roundStartIndex + QUESTIONS_PER_ROUND);
    roundSubmitted = false;
    elements.roundQuestions.replaceChildren();
    const roundEnd = Math.min(roundStartIndex + QUESTIONS_PER_ROUND, totalQuestions);
    elements.questionNumber.textContent = `QUESTIONS ${String(roundStartIndex + 1).padStart(2, "0")}–${String(roundEnd).padStart(2, "0")} / ${totalQuestions}`;
    elements.roundQuestion.textContent = "本回合 5 題";
    elements.roundLabel.textContent = `第 ${currentRoundNumber()} 回合`;
    elements.submitButton.hidden = false;
    elements.submitButton.disabled = false;
    elements.nextButton.hidden = true;
    elements.feedback.hidden = true;
    elements.feedback.textContent = "";
    elements.answerHint.textContent = "每張圖片對應一個答案格";

    roundQuestions.forEach((question, offset) => {
      const card = document.createElement("article");
      card.className = "round-question-card";
      card.dataset.index = String(offset);
      const number = document.createElement("span");
      number.className = "round-question-number";
      number.textContent = `QUESTION ${String(roundStartIndex + offset + 1).padStart(2, "0")}`;
      const frame = document.createElement("div");
      frame.className = "round-photo-frame";
      const image = document.createElement("img");
      image.src = question.image;
      image.alt = `第 ${roundStartIndex + offset + 1} 題藥材圖片`;
      frame.append(image);
      const label = document.createElement("label");
      const inputId = `answer-input-${offset}`;
      label.htmlFor = inputId;
      label.textContent = "答案";
      const input = document.createElement("input");
      input.id = inputId;
      input.className = "round-answer-input";
      input.type = "text";
      input.autocomplete = "off";
      input.placeholder = "輸入藥材名稱";
      input.required = true;
      input.dataset.offset = String(offset);
      const flag = document.createElement("button");
      flag.type = "button";
      flag.className = "question-flag";
      flag.setAttribute("aria-label", `標記第 ${roundStartIndex + offset + 1} 題有疑問`);
      flag.setAttribute("aria-pressed", "false");
      flag.textContent = "▲";
      flag.addEventListener("click", () => {
        const marked = flag.getAttribute("aria-pressed") !== "true";
        flag.setAttribute("aria-pressed", String(marked));
        flag.classList.toggle("is-marked", marked);
      });
      const answerLine = document.createElement("div");
      answerLine.className = "answer-line";
      answerLine.append(input, flag);
      card.append(number, frame, label, answerLine);
      elements.roundQuestions.append(card);
    });

    updateScore();
    elements.roundQuestions.querySelector("input").focus();
  }

  function beginRound() {
    showScreen(elements.quiz);
    renderRound();
    startRoundTimer();
  }

  function startGame() {
    elements.startError.hidden = true;
    examQuestions = selectedExam === "midterm"
      ? gallery.filter((question) => MIDTERM_IDS.has(question.id))
      : gallery;
    totalQuestions = TOTAL_QUESTIONS;
    if (examQuestions.length < totalQuestions) {
      elements.startError.textContent = `目前考試範圍只有 ${examQuestions.length} 張圖片，無法開始。`;
      elements.startError.hidden = false;
      return;
    }
    questions = shuffle(examQuestions).slice(0, totalQuestions);
    elements.sessionSummary.textContent = selectedExam === "midterm"
      ? `期中 ${totalQuestions} 題・${Math.ceil(totalQuestions / QUESTIONS_PER_ROUND)} 回合・滿分 ${totalQuestions}`
      : `期末 ${totalQuestions} 題・${Math.ceil(totalQuestions / QUESTIONS_PER_ROUND)} 回合・滿分 ${totalQuestions}`;
    roundStartIndex = 0;
    score = 0;
    correctCount = 0;
    roundCorrect = 0;
    reviewItems = [];
    beginRound();
  }

  function submitRound(timedOut) {
    if (roundSubmitted) return;
    roundSubmitted = true;
    stopTimer();
    const inputs = [...elements.roundQuestions.querySelectorAll("input")];
    const roundQuestions = questions.slice(roundStartIndex, roundStartIndex + QUESTIONS_PER_ROUND);
    roundCorrect = 0;
    inputs.forEach((input, offset) => {
      const correct = isCorrectAnswer(input.value.trim(), roundQuestions[offset]);
      input.disabled = true;
      input.setAttribute("aria-invalid", correct ? "false" : "true");
      const card = input.closest(".round-question-card");
      card.classList.toggle("is-correct", correct);
      card.classList.toggle("is-incorrect", !correct);
      const flagged = card.querySelector(".question-flag").getAttribute("aria-pressed") === "true";
      if (!correct || flagged) {
        reviewItems.push({
          question: roundQuestions[offset],
          userAnswer: input.value.trim() || "未作答",
          flagged,
        });
      }
      if (correct) {
        roundCorrect += 1;
        score += 1;
        correctCount += 1;
      }
    });
    elements.submitButton.hidden = true;
    elements.nextButton.hidden = false;
    elements.feedback.className = `feedback ${roundCorrect ? "is-correct" : "is-incorrect"}`;
    elements.feedback.textContent = timedOut
      ? `時間到，本回合依答案判定，答對 ${roundCorrect} 題，得分 ${roundCorrect} 分。`
      : `本回合答對 ${roundCorrect} 題，得分 ${roundCorrect} 分。`;
    elements.feedback.hidden = false;
    updateScore();
    elements.nextButton.focus();
  }

  function advanceRound() {
    if (!roundSubmitted) return;
    roundStartIndex += QUESTIONS_PER_ROUND;
    if (roundStartIndex >= totalQuestions) {
      finishGame();
    } else {
      finishRound();
    }
  }

  function finishRound() {
    elements.breakTitle.textContent = `第 ${currentRoundNumber() - 1} 回合完成`;
    elements.breakDescription.textContent = "回合成績已記錄，準備好繼續了嗎？";
    elements.roundScore.textContent = `${roundCorrect} / ${QUESTIONS_PER_ROUND}`;
    elements.breakTotalScore.textContent = String(score);
    elements.continueButton.textContent = `開始第 ${currentRoundNumber()} 回合 →`;
    showScreen(elements.break);
  }

  function finishGame() {
    stopTimer();
    elements.finalScore.textContent = String(score);
    elements.finalCorrect.textContent = String(correctCount);
    elements.finalRounds.textContent = `完成 ${Math.ceil(totalQuestions / QUESTIONS_PER_ROUND)} 回合`;
    renderReviewList();
    showScreen(elements.result);
  }

  function renderReviewList() {
    elements.reviewList.replaceChildren();
    elements.reviewCount.textContent = `${reviewItems.length} 題`;
    elements.reviewEmpty.hidden = reviewItems.length !== 0;
    reviewItems.forEach(({ question, userAnswer, flagged }) => {
      const item = document.createElement("article");
      item.className = "review-item";
      const image = document.createElement("img");
      image.src = question.image;
      image.alt = `${question.answer} 題目圖片`;
      const body = document.createElement("div");
      body.className = "review-copy";
      const title = document.createElement("strong");
      title.textContent = `第 ${question.id} 題${flagged ? " ・ 已標記疑問" : " ・ 答錯"}`;
      const original = document.createElement("span");
      original.textContent = `你的答案：${userAnswer}`;
      const correct = document.createElement("span");
      correct.textContent = `正確答案：${question.answer}`;
      body.append(title, original, correct);
      item.append(image, body);
      elements.reviewList.append(item);
    });
  }

  function quitGame() {
    if (window.confirm("確定要結束本次測驗嗎？目前進度將不會保留。")) {
      stopTimer();
      showScreen(elements.home);
    }
  }

  document.querySelectorAll(".exam-option").forEach((button) => {
    button.addEventListener("click", () => {
      selectedExam = button.dataset.exam;
      startGame();
    });
  });
  elements.answerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (Date.now() >= roundDeadline) {
      submitRound(true);
      return;
    }
    submitRound(false);
  });
  elements.nextButton.addEventListener("click", advanceRound);
  elements.continueButton.addEventListener("click", beginRound);
  elements.quitButton.addEventListener("click", quitGame);
  elements.restartButton.addEventListener("click", startGame);
})();
