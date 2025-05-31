// js/admin/eventManager.js

// Imports will be added at the top by the main module or by this module itself.
// For now, assume utilShowAlert, utilShowConfirm, utilGetFromLocalStorage, utilSaveToLocalStorage are available.
// QUIZ_EVENT_KEY will also need to be available (e.g. imported from a config module or passed).

let eventNameInput, eventStartTimeInput, eventEndTimeInput, eventEnableMessageCheckbox;
let currentEventDisplayEl, eventConfigStatusMessageEl;
let utilShowAlert, utilShowConfirm, utilGetFromLocalStorage, utilSaveToLocalStorage; // To be injected
let QUIZ_EVENT_KEY_CONST; // To be injected

// Internal state for dirty checking if needed within the module, or managed by main.
// For now, assuming main module handles dirty state for navigation.
// let isEventDirty = false;
// let initialEventData = '';

// const getEventFormData = () => JSON.stringify({
// eventName: eventNameInput.value,
// startTime: eventStartTimeInput.value,
// endTime: eventEndTimeInput.value,
// enableMessage: eventEnableMessageCheckbox.checked
// });


export function initEventManager(dependencies, domElements) {
    utilShowAlert = dependencies.showAlert;
    utilShowConfirm = dependencies.showConfirm;
    utilGetFromLocalStorage = dependencies.getFromLocalStorage; // The admin's getFromLocalStorage
    utilSaveToLocalStorage = dependencies.saveToLocalStorage;
    QUIZ_EVENT_KEY_CONST = dependencies.QUIZ_EVENT_KEY;

    eventNameInput = domElements.eventNameInput;
    eventStartTimeInput = domElements.eventStartTimeInput;
    eventEndTimeInput = domElements.eventEndTimeInput;
    eventEnableMessageCheckbox = domElements.eventEnableMessageCheckbox;
    currentEventDisplayEl = domElements.currentEventDisplayEl;
    eventConfigStatusMessageEl = domElements.eventConfigStatusMessageEl;

    // Attach event listeners for buttons specific to this manager if they are not handled by main.js
    // e.g., domElements.saveEventBtn.addEventListener('click', saveCurrentEvent);
    // domElements.clearEventBtn.addEventListener('click', clearCurrentEventConfig);
    // For now, main.js will keep these listeners and call these exported functions.
}

export function loadCurrentEventToUI() {
    const currentEventData = utilGetFromLocalStorage(QUIZ_EVENT_KEY_CONST, null);
    if (currentEventData) {
        if (eventNameInput) eventNameInput.value = currentEventData.eventName || '';
        if (eventStartTimeInput) eventStartTimeInput.value = currentEventData.startTime || '';
        if (eventEndTimeInput) eventEndTimeInput.value = currentEventData.endTime || '';
        if (eventEnableMessageCheckbox) {
            eventEnableMessageCheckbox.checked = typeof currentEventData.enableOutOfPeriodMessage === 'boolean'
                ? currentEventData.enableOutOfPeriodMessage
                : true; // Default to true if undefined
        }
        if (currentEventDisplayEl) {
            currentEventDisplayEl.innerHTML = \`
                <p><strong>Nome:</strong> \${currentEventData.eventName || '<em>Não definido</em>'}</p>
                <p><strong>Início:</strong> \${currentEventData.startTime ? new Date(currentEventData.startTime).toLocaleString('pt-BR') : '<em>Não definido</em>'}</p>
                <p><strong>Fim:</strong> \${currentEventData.endTime ? new Date(currentEventData.endTime).toLocaleString('pt-BR') : '<em>Não definido</em>'}</p>
                <p><strong>Mensagens de Período Ativas:</strong> \${currentEventData.enableOutOfPeriodMessage ? 'Sim' : 'Não'}</p>
            \`;
        }
    } else {
        if (eventNameInput) eventNameInput.value = '';
        if (eventStartTimeInput) eventStartTimeInput.value = '';
        if (eventEndTimeInput) eventEndTimeInput.value = '';
        if (eventEnableMessageCheckbox) eventEnableMessageCheckbox.checked = true; // Default for new event
        if (currentEventDisplayEl) currentEventDisplayEl.innerHTML = '<p>Nenhum evento configurado.</p>';
    }
    // initialEventData = getEventFormData(); // If dirty checking is internal
    // isEventDirty = false;
    if (eventConfigStatusMessageEl) eventConfigStatusMessageEl.textContent = '';
}

export function saveCurrentEvent(isNavigating = false, callbacks = {}) {
    const eventName = eventNameInput.value.trim();
    const startTime = eventStartTimeInput.value;
    const endTime = eventEndTimeInput.value;
    const enableMessage = eventEnableMessageCheckbox.checked;

    if (!startTime || !endTime) {
        utilShowAlert('As datas de início e fim do evento são obrigatórias.', 'warning');
        if (eventConfigStatusMessageEl) {
            eventConfigStatusMessageEl.textContent = 'Datas de início e fim são obrigatórias.';
            eventConfigStatusMessageEl.className = 'status-message error';
        }
        if (callbacks.onSaveFailed) callbacks.onSaveFailed();
        return false;
    }
    if (new Date(endTime) <= new Date(startTime)) {
        utilShowAlert('A data de fim deve ser posterior à data de início.', 'warning');
        if (eventConfigStatusMessageEl) {
            eventConfigStatusMessageEl.textContent = 'Data de fim deve ser posterior à de início.';
            eventConfigStatusMessageEl.className = 'status-message error';
        }
        if (callbacks.onSaveFailed) callbacks.onSaveFailed();
        return false;
    }

    const eventData = {
        eventName: eventName,
        startTime: startTime,
        endTime: endTime,
        enableOutOfPeriodMessage: enableMessage
    };
    utilSaveToLocalStorage(QUIZ_EVENT_KEY_CONST, eventData);
    // currentEventAdminData = eventData; // Main.js should update its own copy if needed

    // resetDirtyFlagAndCaptureState('event'); // Main.js handles dirty state
    loadCurrentEventToUI(); // Update the display after saving

    if (!isNavigating && eventConfigStatusMessageEl) {
        eventConfigStatusMessageEl.textContent = 'Evento salvo com sucesso!';
        eventConfigStatusMessageEl.className = 'status-message success';
        setTimeout(() => { if(eventConfigStatusMessageEl) eventConfigStatusMessageEl.textContent = ''; }, 3000);
    }
    if (callbacks.onSaveSuccess) callbacks.onSaveSuccess(eventData);
    return true;
}

export function clearCurrentEventConfig(callbacks = {}) {
    utilShowConfirm('Tem certeza que deseja limpar e desativar o evento atual? O quiz voltará a funcionar sem restrições de período.',
    {
        onDiscardAndProceed: () => { // Assuming utilShowConfirm maps this to the 'yes' action for admin
            localStorage.removeItem(QUIZ_EVENT_KEY_CONST); // Use direct localStorage or a util for removal
            // currentEventAdminData = null; // Main.js updates its state

            // resetDirtyFlagAndCaptureState('event'); // Main.js handles dirty state
            loadCurrentEventToUI(); // Update display

            if (eventConfigStatusMessageEl) {
                eventConfigStatusMessageEl.textContent = 'Evento limpo/desativado.';
                eventConfigStatusMessageEl.className = 'status-message';
                setTimeout(() => { if(eventConfigStatusMessageEl) eventConfigStatusMessageEl.textContent = ''; }, 3000);
            }
            if(callbacks.onClearSuccess) callbacks.onClearSuccess();
        },
        onCancel: () => {
             if(callbacks.onClearCancel) callbacks.onClearCancel();
        }
    }, 'warning', { discardButtonText: "Sim, Limpar" }); // Escaped quote
}

console.log('js/admin/eventManager.js loaded');
