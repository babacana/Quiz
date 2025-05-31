// js/shared/utils.js

/**
 * Retrieves an item from localStorage and parses it as JSON.
 * @param {string} key - The key of the item to retrieve.
 * @param {*} [defaultValue={}] - The default value to return if the key is not found or parsing fails.
 * @returns {*} The parsed item or the default value.
 */
export function getFromLocalStorage(key, defaultValue = {}) {
    const stored = localStorage.getItem(key);
    try {
        // If stored is null (key not found), return defaultValue directly without trying to parse null
        return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        console.error(`Error getting item ${key} from localStorage:`, e);
        return defaultValue;
    }
}

/**
 * Saves an item to localStorage after converting it to a JSON string.
 * @param {string} key - The key under which to store the item.
 * @param {*} data - The data to store.
 */
export function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving item ${key} to localStorage:`, e);
    }
}

/**
 * Displays an alert modal.
 * Assumes modal structure: <div id="alert-modal">, <p id="alert-message">, <button id="alert-ok-btn">.
 * @param {string} message - The message to display in the alert.
 * @param {string} [type='default'] - The type of alert ('default', 'warning', 'danger').
 */
export function showAlert(message, type = 'default') {
    const modal = document.getElementById('alert-modal');
    const msgEl = document.getElementById('alert-message');
    const okBtn = document.getElementById('alert-ok-btn');

    if (!modal || !msgEl || !okBtn) {
        console.error("Alert modal elements ('alert-modal', 'alert-message', 'alert-ok-btn') not found in the current HTML.");
        return;
    }

    modal.classList.remove('modal-type-warning', 'modal-type-danger'); // Clear previous types
    if (type === 'warning') {
        modal.classList.add('modal-type-warning');
    } else if (type === 'danger') {
        modal.classList.add('modal-type-danger');
    }

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    // Use a named function for the handler to remove it correctly.
    const handler = () => {
        cleanup();
        // App-specific idle timer resets should be called by the module importing this utility
    };

    const onOverlayClick = (event) => {
        if (event.target === modal) {
            cleanup();
            // App-specific idle timer resets
        }
    };

    const cleanup = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', handler);
        modal.removeEventListener('click', onOverlayClick);
    };

    // Remove potentially old listeners before adding new ones
    okBtn.removeEventListener('click', handler); // Ensure no duplicates if called rapidly
    modal.removeEventListener('click', onOverlayClick); // Ensure no duplicates

    okBtn.addEventListener('click', handler);
    modal.addEventListener('click', onOverlayClick);
}

/**
 * Displays a confirmation modal.
 * Assumes modal structure from admin.html:
 * <div id="confirm-modal">, <h3 id="confirm-modal-title">, <p id="confirm-message">,
 * <button id="confirm-save-proceed-btn">, <button id="confirm-proceed-btn">, <button id="confirm-cancel-btn">.
 * @param {string} message - The message for the confirmation.
 * @param {object} [callbacks={}] - Object containing onSaveAndProceed, onDiscardAndProceed, onCancel, onConfirm (for simpler cases).
 * @param {string} [type='default'] - Modal type ('default', 'warning', 'danger').
 * @param {object} [options={}] - Options for button text and title (title, showSaveButton, saveButtonText, discardButtonText, cancelButtonText).
 */
export function showConfirm(message, callbacks = {}, type = 'default', options = {}) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const titleEl = document.getElementById('confirm-modal-title');

    let saveProceedBtnEl = document.getElementById('confirm-save-proceed-btn');
    let discardProceedBtnEl = document.getElementById('confirm-proceed-btn');
    let cancelBtnEl = document.getElementById('confirm-cancel-btn');

    // Basic check for essential modal elements
    if (!modal || !msgEl || !titleEl) {
        console.error("Core confirmation modal elements ('confirm-modal', 'confirm-message', 'confirm-modal-title') not found.");
        // Fallback to native confirm if critical elements are missing, and provide a way for callbacks to still work.
        if (confirm(message)) { // Native confirm
            if (options.showSaveButton && typeof callbacks.onSaveAndProceed === 'function') {
                callbacks.onSaveAndProceed();
            } else if (typeof callbacks.onConfirm === 'function') { // Generic confirm
                callbacks.onConfirm();
            } else if (typeof callbacks.onDiscardAndProceed === 'function') { // If onConfirm is not there, try onDiscardAndProceed for positive action
                callbacks.onDiscardAndProceed();
            }
        } else {
            if (typeof callbacks.onCancel === 'function') {
                callbacks.onCancel();
            }
        }
        return;
    }

    // If the specific admin buttons aren't found, it might be a simpler confirm (e.g. from quiz.js)
    // For now, this utility prioritizes the admin-style confirm. Adapting quiz.js or its HTML will be handled later.
    if (!discardProceedBtnEl || !cancelBtnEl) {
        console.warn("Full admin confirmation button structure not found. Ensure 'confirm-proceed-btn' and 'confirm-cancel-btn' exist. Functionality may be limited.");
        // If trying to use with a simpler modal (e.g. only yes/no from quiz.js), those buttons would need different IDs or this function needs more params.
        // This version will proceed assuming it might only find a subset of buttons if the full admin structure isn't there.
    }


    titleEl.textContent = options.title || "Confirmação";
    msgEl.textContent = message;

    // Clone buttons to remove existing event listeners before re-attaching
    const newSaveProceedBtn = saveProceedBtnEl ? saveProceedBtnEl.cloneNode(true) : null;
    if (saveProceedBtnEl && newSaveProceedBtn) {
      saveProceedBtnEl.parentNode.replaceChild(newSaveProceedBtn, saveProceedBtnEl);
      saveProceedBtnEl = newSaveProceedBtn; // Update reference to the new button
    }

    const newDiscardProceedBtn = discardProceedBtnEl ? discardProceedBtnEl.cloneNode(true) : null;
    if (discardProceedBtnEl && newDiscardProceedBtn) {
        discardProceedBtnEl.parentNode.replaceChild(newDiscardProceedBtn, discardProceedBtnEl);
        discardProceedBtnEl = newDiscardProceedBtn;
    }

    const newCancelBtn = cancelBtnEl ? cancelBtnEl.cloneNode(true) : null;
    if (cancelBtnEl && newCancelBtn) {
        cancelBtnEl.parentNode.replaceChild(newCancelBtn, cancelBtnEl);
        cancelBtnEl = newCancelBtn;
    }


    if (saveProceedBtnEl) {
        if (options.showSaveButton) {
            saveProceedBtnEl.classList.remove('hidden');
            saveProceedBtnEl.textContent = options.saveButtonText || "Salvar e Prosseguir";
        } else {
            saveProceedBtnEl.classList.add('hidden');
        }
    }

    if (discardProceedBtnEl) {
        discardProceedBtnEl.textContent = options.discardButtonText || (options.showSaveButton ? "Prosseguir Sem Salvar" : "Sim");
    }
    if (cancelBtnEl) {
        cancelBtnEl.textContent = options.cancelButtonText || (options.showSaveButton ? "Cancelar" : "Não");
    }


    modal.classList.remove('modal-type-danger', 'modal-type-warning');
    if (type === 'danger') {
        modal.classList.add('modal-type-danger');
        if(discardProceedBtnEl && discardProceedBtnEl.classList.contains('btn-success')) discardProceedBtnEl.classList.remove('btn-success');
        if(discardProceedBtnEl) discardProceedBtnEl.classList.add('btn-danger');
    } else if (type === 'warning') {
        modal.classList.add('modal-type-warning');
    } else {
        if(discardProceedBtnEl && discardProceedBtnEl.classList.contains('btn-danger')) discardProceedBtnEl.classList.remove('btn-danger');
        // The line below was commented out, ensure this is intended.
        // if(discardProceedBtnEl) discardProceedBtnEl.classList.add('btn-success');
    }

    modal.classList.remove('hidden');

    const onOverlayClick = (event) => { // Defined once for use in add/remove
        if (event.target === modal) {
            cleanup();
            if (typeof callbacks.onCancel === 'function') callbacks.onCancel();
        }
    };

    const cleanup = () => {
        modal.classList.add('hidden');
        modal.removeEventListener('click', onOverlayClick);
        // Listeners on cloned buttons are automatically fresh, no specific removal needed from them if they are replaced each time.
    };

    // Remove any existing overlay listener before adding a new one.
    modal.removeEventListener('click', onOverlayClick);
    modal.addEventListener('click', onOverlayClick);


    if (saveProceedBtnEl) {
        saveProceedBtnEl.addEventListener('click', () => {
            cleanup();
            if (typeof callbacks.onSaveAndProceed === 'function') callbacks.onSaveAndProceed();
        }, { once: true });
    }

    if (discardProceedBtnEl) {
        discardProceedBtnEl.addEventListener('click', () => {
            cleanup();
            if (options.showSaveButton) {
                if (typeof callbacks.onDiscardAndProceed === 'function') callbacks.onDiscardAndProceed();
            } else {
                if (typeof callbacks.onConfirm === 'function') callbacks.onConfirm();
                else if (typeof callbacks.onDiscardAndProceed === 'function') callbacks.onDiscardAndProceed();
            }
        }, { once: true });
    }

    if (cancelBtnEl) {
        cancelBtnEl.addEventListener('click', () => {
            cleanup();
            if (typeof callbacks.onCancel === 'function') callbacks.onCancel();
        }, { once: true });
    }
}


/**
 * Formats seconds into MM:SS string.
 * @param {number} s - Total seconds.
 * @returns {string} Formatted time string.
 */
export function formatTime(s) {
    if (isNaN(s) || s < 0) return "00:00";
    const minutes = Math.floor(s / 60);
    const seconds = s % 60; // Corrected: was s % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Shuffles an array. Returns a new shuffled array (does not mutate in place).
 * @param {Array} array - The array to shuffle.
 * @returns {Array} The new shuffled array.
 */
export function shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    const newArray = [...array]; // Create a copy
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
    }
    return newArray;
}
