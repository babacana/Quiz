// js/quiz/ui.js

// Note: Imports for shared utilities like formatTime, shuffleArray, getFromLocalStorage
// from '../shared/utils.js' will be added in a later step when integrating this module.

// Module-scoped DOM element variables, to be populated by initUIElements
let quizContainer, htmlEl, screensNodeList, accessibilityControlsElement, virtualKeyboardElement;
let nomeInputElement, telefoneInputElement, startQuizButton, viewRankingInitialButton;
let questionCounterElement, timerElement, questionTextElement, optionsContainerElement, nextQuestionButtonElement, giveUpButtonElement;
let showRankingButton, restartQuizButton, rankingListElement, backToInitialButton, idleScreenElement, idleCallToActionElement;
let resultPlayerNameTitleElement, resultSummaryDetailsElement, resultPrizeMessageElement, resultTop3CongratsMessageElement;
let top3CongratsModalElement, top3ModalMessageContentElement;
let incorrectAnswersModalElement, incorrectAnswersListElement, showIncorrectAnswersButtonRef;
let progressBarFillElement, eventStatusMessageElement, questionDifficultyTagElement;
let questionTimeBarContainerElement, questionTimeBarFillElement, timeOutMessageElement, postQuestionControlsElement;

// Internal helper to query DOM elements
const getEl = (id) => document.getElementById(id);
const queryEl = (selector) => document.querySelector(selector);
const queryElAll = (selector) => document.querySelectorAll(selector);

const FONT_SIZES_PX = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
let currentFontStep = FONT_SIZES_PX.indexOf(18);
if (currentFontStep === -1) {
    currentFontStep = FONT_SIZES_PX.indexOf(16) !== -1 ? FONT_SIZES_PX.indexOf(16) : Math.floor(FONT_SIZES_PX.length / 2);
}

export function initUIElements() {
    quizContainer = queryEl('.quiz-container');
    htmlEl = document.documentElement;
    screensNodeList = queryElAll('.screen');
    accessibilityControlsElement = getEl('accessibility-controls');
    virtualKeyboardElement = getEl('virtual-keyboard');

    nomeInputElement = getEl('nome');
    telefoneInputElement = getEl('telefone');
    startQuizButton = getEl('start-quiz-btn');
    viewRankingInitialButton = getEl('view-ranking-initial-btn');

    questionCounterElement = getEl('question-counter');
    timerElement = getEl('timer');
    questionTextElement = getEl('question-text');
    optionsContainerElement = getEl('options-container');
    nextQuestionButtonElement = getEl('next-question-btn');
    giveUpButtonElement = getEl('give-up-btn');

    showRankingButton = getEl('show-ranking-btn');
    restartQuizButton = getEl('restart-quiz-btn');
    rankingListElement = getEl('ranking-list');
    backToInitialButton = getEl('back-to-initial-btn');
    idleScreenElement = getEl('idle-screen');
    idleCallToActionElement = getEl('idle-call-to-action');

    resultPlayerNameTitleElement = getEl('result-player-name-title');
    resultSummaryDetailsElement = getEl('result-summary-details');
    resultPrizeMessageElement = getEl('result-prize-message');
    resultTop3CongratsMessageElement = getEl('result-top3-congrats-message');

    top3CongratsModalElement = getEl('top3-congrats-modal');
    top3ModalMessageContentElement = getEl('top3-modal-message-content');

    incorrectAnswersModalElement = getEl('incorrect-answers-modal');
    incorrectAnswersListElement = getEl('incorrect-answers-list');
    showIncorrectAnswersButtonRef = getEl('show-incorrect-answers-btn');

    progressBarFillElement = getEl('progress-bar-fill');
    eventStatusMessageElement = getEl('event-status-message');
    questionDifficultyTagElement = getEl('question-difficulty-tag');

    questionTimeBarContainerElement = getEl('question-time-bar-container');
    questionTimeBarFillElement = getEl('question-time-bar-fill');
    timeOutMessageElement = getEl('timeout-message-text');
    postQuestionControlsElement = getEl('post-question-controls');
}

export function applyFontSize() {
    if (!htmlEl) htmlEl = document.documentElement;
    if (currentFontStep < 0) currentFontStep = 0;
    if (currentFontStep >= FONT_SIZES_PX.length) currentFontStep = FONT_SIZES_PX.length - 1;
    htmlEl.style.fontSize = `${FONT_SIZES_PX[currentFontStep]}px`;

    const decreaseBtn = getEl('decrease-font');
    const increaseBtn = getEl('increase-font');
    if (decreaseBtn) decreaseBtn.disabled = currentFontStep === 0;
    if (increaseBtn) increaseBtn.disabled = currentFontStep >= FONT_SIZES_PX.length - 1;
}

export function loadFontPreference() {
    currentFontStep = FONT_SIZES_PX.indexOf(18);
    if (currentFontStep === -1) {
        currentFontStep = FONT_SIZES_PX.indexOf(16) !== -1 ? FONT_SIZES_PX.indexOf(16) : Math.floor(FONT_SIZES_PX.length / 2);
    }
    applyFontSize();
}

export function incrementFontStep() {
    if (currentFontStep < FONT_SIZES_PX.length - 1) {
        currentFontStep++;
        applyFontSize();
    }
}
export function decrementFontStep() {
     if (currentFontStep > 0) {
        currentFontStep--;
        applyFontSize();
    }
}

export function applyCustomLogo(logoFileName, defaultLogoSrc) {
    const finalLogoSrc = logoFileName ? `assets/${logoFileName}` : defaultLogoSrc;
    const logoElements = queryElAll('.caesb-logo');
    logoElements.forEach(logoEl => {
        logoEl.src = finalLogoSrc;
        logoEl.onerror = () => { logoEl.src = defaultLogoSrc; };
    });
}

export function applyCustomBackground(settings, customizations) {
    if (!quizContainer) { // Ensure quizContainer is initialized
        quizContainer = queryEl('.quiz-container');
        if (!quizContainer) {
            console.error("applyCustomBackground: quizContainer not found.");
            return;
        }
    }
    if (!htmlEl) htmlEl = document.documentElement;


    if (settings.enableCustomBackground && settings.customBackgroundFileName) {
        const imgPath = `assets/${settings.customBackgroundFileName}`;
        quizContainer.style.backgroundImage = \`url('\${imgPath}')\`;
        quizContainer.style.backgroundSize = 'cover';
        quizContainer.style.backgroundPosition = 'center bottom';
        quizContainer.style.backgroundRepeat = 'no-repeat';
        htmlEl.style.removeProperty('--quiz-main-background');
        quizContainer.style.backgroundColor = '';
    } else {
        quizContainer.style.backgroundImage = '';
        const bgColor = customizations.colors.quizMainBackground;
        htmlEl.style.setProperty('--quiz-main-background', bgColor);
        quizContainer.style.backgroundColor = bgColor;
    }
}

export function applyVirtualKeyboardHeight(targetHeightVh, minVh = 20, maxVh = 60) {
    if (!virtualKeyboardElement) return;
    if (!htmlEl) htmlEl = document.documentElement;
    const currentKeyboardHeightVh = parseFloat(targetHeightVh);
    if (isNaN(currentKeyboardHeightVh)) return;

    const clampedHeightVh = Math.max(minVh, Math.min(maxVh, currentKeyboardHeightVh));
    virtualKeyboardElement.style.height = `${clampedHeightVh}vh`;

    const keyboardHeightPx = (clampedHeightVh / 100) * window.innerHeight;
    const baseFontSizePx = keyboardHeightPx * 0.08;
    const minFontSizePx = 14;
    const maxFontSizePx = 32;
    const finalFontSizePx = Math.max(minFontSizePx, Math.min(maxFontSizePx, baseFontSizePx));
    htmlEl.style.setProperty('--virtual-keyboard-key-font-size', `${finalFontSizePx}px`);
}

export function applyThemeCustomizations(settings, customizations, defaultCustomizations) {
    if (!htmlEl) htmlEl = document.documentElement;

    const currentColors = { ...defaultCustomizations.colors, ...(customizations.colors || {}) };
    for (const key in currentColors) {
        htmlEl.style.setProperty(\`--\${key.replace(/([A-Z])/g, '-$1').toLowerCase()}\`, currentColors[key]);
    }

    applyCustomBackground(settings, customizations); // Uses htmlEl and quizContainer

    const currentFontSizes = { ...defaultCustomizations.fontSizes, ...(customizations.fontSizes || {}) };
    for (const key in currentFontSizes) {
        htmlEl.style.setProperty(\`--\${key.replace(/([A-Z])/g, '-$1').toLowerCase()}\`, currentFontSizes[key]);
    }

    const currentTexts = { ...defaultCustomizations.texts, ...(customizations.texts || {}) };
    const initialScreenTitleEl = queryEl('#initial-screen h2');
    if(initialScreenTitleEl) initialScreenTitleEl.textContent = currentTexts.initialScreenTitle;

    const initialScreenSloganEl = queryEl('#initial-screen .slogan');
    if(initialScreenSloganEl) initialScreenSloganEl.textContent = currentTexts.initialScreenSlogan;

    if(startQuizButton) startQuizButton.textContent = currentTexts.initialScreenStartButton;
    if(viewRankingInitialButton) viewRankingInitialButton.textContent = currentTexts.initialScreenRankingButton;
    if(showRankingButton) showRankingButton.textContent = currentTexts.resultScreenRankingButton;
    if(restartQuizButton) restartQuizButton.textContent = currentTexts.resultScreenPlayAgainButton;

    const rankingScreenTitleEl = queryEl('#ranking-screen h2');
    if(rankingScreenTitleEl) rankingScreenTitleEl.textContent = currentTexts.rankingScreenTitle;

    if(backToInitialButton) backToInitialButton.textContent = currentTexts.rankingScreenBackButton;
    if(idleCallToActionElement) idleCallToActionElement.textContent = currentTexts.idleScreenCallToAction;

    const winnerModalTitle = getEl('winner-already-modal-title');
    if(winnerModalTitle) winnerModalTitle.textContent = currentTexts.modalAlreadyWonTitle;

    const winnerModalMsg = getEl('winner-already-main-message');
    if(winnerModalMsg) winnerModalMsg.textContent = currentTexts.modalAlreadyWonMessage;

    const incorrectAnsModalTitle = getEl('incorrect-answers-modal-title');
    if(incorrectAnsModalTitle) incorrectAnsModalTitle.textContent = currentTexts.modalIncorrectAnswersTitle;

    if(nomeInputElement) nomeInputElement.placeholder = currentTexts.inputNamePlaceholder;
    if(telefoneInputElement) telefoneInputElement.placeholder = currentTexts.inputPhonePlaceholder;

    applyVirtualKeyboardHeight(settings.virtualKeyboardHeight);
}

export function showScreenUI(screenId, currentSettings, quizCustomizationsData, eventData, resetIdleTimerFn, getFromStorageFn) {
    if (!screensNodeList || screensNodeList.length === 0) {
        console.error("ui.showScreenUI: screensNodeList not initialized or empty.");
        return;
    }
    let foundScreen = false;
    screensNodeList.forEach(screen => {
        if (screen && screen.id) {
            const isActive = screen.id === screenId;
            screen.style.display = isActive ? 'flex' : 'none';
            screen.classList.toggle('active', isActive);
            if (isActive) foundScreen = true;
        }
    });
    if (!foundScreen) console.error(`ui.showScreenUI: Screen with ID '\${screenId}' not found.`);

    if (virtualKeyboardElement && screenId !== 'initial-screen' && !virtualKeyboardElement.classList.contains('hidden')) {
        if (currentSettings.enableVirtualKeyboard) {
            virtualKeyboardElement.classList.add('hidden');
            const keyboardResizeHandle = getEl('keyboard-resize-handle');
            if (keyboardResizeHandle) keyboardResizeHandle.classList.add('hidden');
        }
    }
    if (accessibilityControlsElement) {
        accessibilityControlsElement.classList.toggle('hidden-on-idle', screenId === 'idle-screen');
    }

    if (screenId === 'idle-screen') {
        updateIdleScreenMessageUI(quizCustomizationsData, eventData);
        if (quizContainer) {
            quizContainer.classList.remove('fading-to-idle', 'time-alert-border-pulse-warning', 'time-alert-border-pulse-critical', 'time-alert-flash-effect');
        }
    } else {
        if(resetIdleTimerFn) resetIdleTimerFn();
    }

    if (screenId === 'initial-screen') {
        updateInitialScreenForEventStateUI(eventData);
        if (nomeInputElement) nomeInputElement.value = '';
        if (telefoneInputElement) telefoneInputElement.value = '';
        applyVirtualKeyboardHeight(currentSettings.virtualKeyboardHeight);
    }
}

export function updateIdleScreenMessageUI(customizations, eventData) {
    if (!idleCallToActionElement) return;
    const checkEventStatusForUI = () => {
        if (!eventData || !eventData.startTime || !eventData.endTime) return 'no_event';
        const now = new Date();
        const startTime = new Date(eventData.startTime);
        const endTime = new Date(eventData.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 'no_event';
        if (now < startTime) return 'before';
        if (now > endTime) return 'after';
        return 'during';
    };
    const eventStatus = checkEventStatusForUI();
    const eventMessageActive = eventData && eventData.enableOutOfPeriodMessage;
    const callToActionText = customizations.texts.idleScreenCallToAction;
    if (eventMessageActive) {
        if (eventStatus === 'before') idleCallToActionElement.innerHTML = \`QUIZ EM BREVE!<br><small>Toque para mais informações</small>\`;
        else if (eventStatus === 'after') idleCallToActionElement.innerHTML = \`QUIZ ENCERRADO<br><small>Obrigado por participar!</small>\`;
        else idleCallToActionElement.textContent = callToActionText;
    } else {
        idleCallToActionElement.textContent = callToActionText;
    }
}

export function updateInitialScreenForEventStateUI(eventData) {
    if (!eventStatusMessageElement || !startQuizButton) return;
    const checkEventStatusForUI = () => {
        if (!eventData || !eventData.startTime || !eventData.endTime) return 'no_event';
        const now = new Date();
        const startTime = new Date(eventData.startTime);
        const endTime = new Date(eventData.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 'no_event';
        if (now < startTime) return 'before';
        if (now > endTime) return 'after';
        return 'during';
    };
    const eventStatus = checkEventStatusForUI();
    const eventMessageActive = eventData && eventData.enableOutOfPeriodMessage;
    eventStatusMessageElement.classList.add('hidden');
    eventStatusMessageElement.textContent = '';
    startQuizButton.disabled = false;
    startQuizButton.classList.remove('hidden');
    if (eventMessageActive) {
        if (eventStatus === 'before') {
            startQuizButton.disabled = true;
            eventStatusMessageElement.textContent = \`O quiz "\${eventData.eventName || 'especial'}" ainda não começou! Prepare-se, a diversão começa em \${new Date(eventData.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.\`;
            eventStatusMessageElement.classList.remove('hidden');
        } else if (eventStatus === 'after') {
            startQuizButton.disabled = true;
            eventStatusMessageElement.textContent = \`O quiz "\${eventData.eventName || 'especial'}" foi encerrado em \${new Date(eventData.endTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Obrigado pela participação!\`;
            eventStatusMessageElement.classList.remove('hidden');
        }
    }
}

export function showWinnerAlreadyModalUI(timestamp) {
    const modal = getEl('winner-already-modal');
    const timestampEl = getEl('winner-already-timestamp');
    if (modal && timestampEl) {
        const dateObj = new Date(timestamp);
        const datePart = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timePart = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
        timestampEl.textContent = \`Participação em: \${datePart} às \${timePart}\`;
        modal.classList.remove('hidden');
    }
}
export function hideWinnerAlreadyModalUI() {
    const modal = getEl('winner-already-modal');
    if (modal) modal.classList.add('hidden');
    if (nomeInputElement) nomeInputElement.value = '';
    if (telefoneInputElement) telefoneInputElement.value = '';
}

export function showIncorrectAnswersModalFuncUI() {
    if (incorrectAnswersModalElement) incorrectAnswersModalElement.classList.remove('hidden');
}
export function hideIncorrectAnswersModalFuncUI() {
    if (incorrectAnswersModalElement) incorrectAnswersModalElement.classList.add('hidden');
}

export function showTop3CongratsModalUI() {
    if (top3CongratsModalElement) top3CongratsModalElement.classList.remove('hidden');
}
export function hideTop3CongratsModalUI() {
    if (top3CongratsModalElement) top3CongratsModalElement.classList.add('hidden');
}

export function displayIncorrectAnswersUI(playerAttempts) {
    if (!incorrectAnswersListElement) return;
    incorrectAnswersListElement.innerHTML = '';
    const incorrectAttemptsFiltered = playerAttempts.filter(attempt => !attempt.isCorrect);
    if (incorrectAttemptsFiltered.length > 0) {
        incorrectAttemptsFiltered.forEach(attempt => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('question-review-item');
            // Using textContent for security, but innerHTML for specific HTML structure
            const title = document.createElement('h4');
            title.textContent = attempt.questionText;
            itemDiv.appendChild(title);

            const userAnswerP = document.createElement('p');
            userAnswerP.classList.add('user-answer');
            userAnswerP.innerHTML = \`<span class="review-label">Sua resposta: </span><span class="review-value-user">\${attempt.selectedOptionText}</span>\`;
            itemDiv.appendChild(userAnswerP);

            const correctAnswerP = document.createElement('p');
            correctAnswerP.classList.add('correct-answer-review');
            correctAnswerP.innerHTML = \`<span class="review-label">Resposta correta: </span><span class="review-value-correct">\${attempt.correctOptionText}</span>\`;
            itemDiv.appendChild(correctAnswerP);

            incorrectAnswersListElement.appendChild(itemDiv);
        });
        showIncorrectAnswersModalFuncUI();
    }
}

export function updateQuestionDisplay(questionData, currentIndex, totalQuestions, difficultyMap, shuffleArrayFn, addOptionEventListenerFn) {
    if (!questionTextElement || !questionCounterElement || !optionsContainerElement || !progressBarFillElement || !questionDifficultyTagElement) return;

    questionTextElement.textContent = questionData.text;
    questionCounterElement.textContent = `${currentIndex + 1}/${totalQuestions}`;
    progressBarFillElement.style.width = `${((currentIndex + 1) / totalQuestions) * 100}%`;

    const difficultyText = questionData.difficulty ? (difficultyMap[questionData.difficulty] || questionData.difficulty.charAt(0).toUpperCase() + questionData.difficulty.slice(1)) : 'N/D';
    questionDifficultyTagElement.textContent = difficultyText;
    questionDifficultyTagElement.className = \`question-difficulty-tag difficulty-\${questionData.difficulty || 'na'}\`;

    optionsContainerElement.innerHTML = '';
    const optionsToDisplay = questionData.options.map((optText, idx) => ({ text: optText, isCorrectOriginal: idx === questionData.correct }));
    const shuffledOptions = shuffleArrayFn([...optionsToDisplay]);

    shuffledOptions.forEach(optData => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('option');
        optionDiv.textContent = optData.text;
        optionDiv.dataset.isCorrect = optData.isCorrectOriginal;
        addOptionEventListenerFn(optionDiv, questionData.id);
        optionsContainerElement.appendChild(optionDiv);
    });

    if(giveUpButtonElement) giveUpButtonElement.classList.remove('hidden');
    if(postQuestionControlsElement) postQuestionControlsElement.classList.add('hidden');
    if(optionsContainerElement) optionsContainerElement.classList.remove('options-really-dimmed');
    if(questionTimeBarContainerElement) questionTimeBarContainerElement.classList.remove('hidden');
    if(timeOutMessageElement) timeOutMessageElement.classList.add('hidden');
}

export function updateQuestionTimerBar(timeLeft, totalTimeForQuestion) {
    if (!questionTimeBarFillElement) return;
    if (timeLeft <= 0) {
        questionTimeBarFillElement.style.width = '0%';
        questionTimeBarFillElement.style.backgroundColor = 'hsl(0, 80%, 50%)'; // Red
        return;
    }
    const percentageRemaining = (timeLeft / totalTimeForQuestion) * 100;
    questionTimeBarFillElement.style.width = `${percentageRemaining}%`;
    let hue;
    const warningTime = 10, criticalTime = 5;
    const greenHue = 120, yellowHue = 60, redHue = 0;
    if (timeLeft > warningTime) hue = greenHue;
    else if (timeLeft > criticalTime) hue = redHue + ((timeLeft - criticalTime) / (warningTime - criticalTime)) * (yellowHue - redHue);
    else hue = redHue;
    questionTimeBarFillElement.style.backgroundColor = \`hsl(\${Math.max(0, Math.min(120, hue))}, 80%, 50%)\`;
}

export function showAnswerFeedbackUI(selectedOptionDiv, isCorrect, showCorrectAnswerSetting) {
    if (!optionsContainerElement) return;
    Array.from(optionsContainerElement.children).forEach(child => {
        child.classList.add('disabled');
        if (child.dataset.isCorrect === 'true' && !isCorrect && showCorrectAnswerSetting) {
            child.classList.add('correct');
        }
    });
    selectedOptionDiv.classList.add(isCorrect ? 'correct' : 'incorrect');

    if(postQuestionControlsElement) postQuestionControlsElement.classList.remove('hidden');
    if(giveUpButtonElement) giveUpButtonElement.classList.add('hidden');
    if(questionTimeBarContainerElement) questionTimeBarContainerElement.classList.add('hidden');
    if(timeOutMessageElement) timeOutMessageElement.classList.add('hidden');
}

export function showTimeoutFeedbackUI(showCorrectAnswerSetting) {
    if(questionTimeBarContainerElement) questionTimeBarContainerElement.classList.add('hidden');
    if(optionsContainerElement) {
        optionsContainerElement.classList.add('options-really-dimmed');
        Array.from(optionsContainerElement.children).forEach(child => {
            child.classList.add('disabled');
            if (child.dataset.isCorrect === 'true' && showCorrectAnswerSetting) {
                child.classList.add('correct');
            }
        });
    }
    if(timeOutMessageElement) {
        timeOutMessageElement.textContent = "Tempo Esgotado!";
        timeOutMessageElement.classList.remove('hidden');
    }
    if(postQuestionControlsElement) postQuestionControlsElement.classList.remove('hidden');
    if(giveUpButtonElement) giveUpButtonElement.classList.add('hidden');
}

export function updateNextButtonTextUI(isLastQuestion, nextButtonText, finalizeButtonText) {
    if (nextQuestionButtonElement) {
        nextQuestionButtonElement.textContent = isLastQuestion ? finalizeButtonText : nextButtonText;
    }
}

export function updateResultScreenUI(playerName, score, totalQuestions, timeSeconds, rank, prizeWonText, prizeNotWonText, minScoreForPrize, playerAttemptsData, formatTimeFn) {
    if (resultPlayerNameTitleElement) { resultPlayerNameTitleElement.textContent = playerName + ","; resultPlayerNameTitleElement.classList.remove('hidden'); }
    if (resultTop3CongratsMessageElement) { resultTop3CongratsMessageElement.classList.add('hidden'); resultTop3CongratsMessageElement.textContent = ''; }

    if (rank > 0 && rank <= 3) {
        if (top3ModalMessageContentElement) {
            top3ModalMessageContentElement.innerHTML = \`Parabéns, <span class="msg-player-name">\${playerName}</span>!<br>Você saneou todas as dúvidas e mostrou um conhecimento cristalino! 💎<br><span class="msg-rank-highlight">TOP \${rank}</span> com selo <span class="msg-caesb-highlight">CAESB</span> de aprovação!\`;
        }
        showTop3CongratsModalUI();
    }
    if (resultSummaryDetailsElement) resultSummaryDetailsElement.innerHTML = \`<p>Seu Desempenho: <strong>\${score}/\${totalQuestions}</strong> acertos</p><p>Tempo: <strong>\${formatTimeFn(timeSeconds)}</strong></p><p>Ranking: <strong>\${rank > 0 ? rank + 'º lugar' : 'N/A'}</strong></p>\`;
    if (resultPrizeMessageElement) {
        resultPrizeMessageElement.textContent = score >= minScoreForPrize ? prizeWonText : prizeNotWonText;
        resultPrizeMessageElement.className = score >= minScoreForPrize ? 'result-message prize-won' : 'result-message prize-not-won';
        resultPrizeMessageElement.classList.remove('hidden');
    }
    if (showIncorrectAnswersButtonRef) {
        const incorrectAttempts = playerAttemptsData.filter(attempt => !attempt.isCorrect);
        showIncorrectAnswersButtonRef.classList.toggle('hidden', incorrectAttempts.length === 0);
    }
    if(giveUpButtonElement) giveUpButtonElement.classList.add('hidden');
}

export function loadRankingListUI(sortedParticipants, formatTimeFn) {
    if (!rankingListElement) return;
    rankingListElement.innerHTML = '';
    if (sortedParticipants.length === 0) {
        rankingListElement.innerHTML = '<li>Nenhum participante no ranking ainda.</li>';
        return;
    }
    sortedParticipants.forEach((p, i) => {
        const li = document.createElement('li');
        li.innerHTML = \`<span>\${i + 1}. <span class="rank-name">\${p.name}</span></span> <span class="rank-score">\${p.score} Acertos</span> <span class="rank-time">\${formatTimeFn(p.time)}</span>\`;
        rankingListElement.appendChild(li);
    });
}

export function setQuizContainerFade(isFading) {
    if (quizContainer) {
        quizContainer.classList.toggle('fading-to-idle', isFading);
        if (!isFading) {
            quizContainer.classList.remove('time-alert-border-pulse-warning', 'time-alert-border-pulse-critical', 'time-alert-flash-effect');
        }
    }
}

export function setMainTimerDisplay(timeString) {
    if (timerElement) {
        timerElement.textContent = timeString;
        timerElement.className = 'quiz-timer timer-normal';
    }
}

export function applyTimeAlertVisuals(alertType) {
    if (!quizContainer) return;
    quizContainer.classList.remove('time-alert-border-pulse-warning', 'time-alert-border-pulse-critical', 'time-alert-flash-effect');
    if (alertType === 'warning') {
        quizContainer.classList.add('time-alert-border-pulse-warning');
    } else if (alertType === 'critical') {
        quizContainer.classList.add('time-alert-border-pulse-critical');
    }
}
export function triggerScreenFlashUI() {
    if (!quizContainer) return;
    quizContainer.classList.add('time-alert-flash-effect');
    setTimeout(() => {
        if (quizContainer) quizContainer.classList.remove('time-alert-flash-effect');
    }, 300);
}
