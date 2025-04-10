import { createTag,parseEncodedConfig, createIntersectionObserver } from '../../utils/utils.js';
import { initFaas, loadFaasFiles } from './utils.js';

const ROOT_MARGIN = 1000;

const loadFaas = async (a) => {
  await loadFaasFiles();
  const encodedConfig = a.href.split('#')[1];
  const faas = initFaas(parseEncodedConfig(encodedConfig), a);

  // if FaaS is in Modal, make it column2 style.
  if (faas && faas.closest('.dialog-modal')) {
    faas.querySelector('.faas').classList.add('column2');
  }

  // Accessibility logic
  // Set up a MutationObserver to wait for the form to be added to the DOM
  const formObserver = new MutationObserver(() => {
    // Look for the form element in the mutations
    const faasForm = faas.querySelector('.faas-form');
    if (!faasForm) return;

    // Add an empty element that will serve as the aria live region announcement wrapper
    const ariaLiveRegion = createTag('div', {
      'aria-live': 'assertive',
      role: 'alert',
      class: 'faas-aria-live-region',
    });
    faasForm.prepend(ariaLiveRegion);

    // Set up a MutationObserver to watch for error classes on rows
    const errorObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const rowElement = mutation.target;
          if (rowElement.classList.contains('error')) {
            const errorMessage = rowElement.querySelector('.errorMessage');
            if (errorMessage && errorMessage.textContent) {
              ariaLiveRegion.textContent = errorMessage.textContent;
              // ariaLiveRegion.focus();

              setTimeout(() => {
                ariaLiveRegion.textContent = '';
              }, 3000);
            }
          }
        }
      });
    });

    // Find all row elements and observe them for class changes
    const rowElements = faasForm.querySelectorAll('.row');
    rowElements.forEach((row) => {
      errorObserver.observe(row, { attributes: true, attributeFilter: ['class'] });
    });

    // Disconnect the observer once we've processed the form
    formObserver.disconnect();
  });

  // Start observing the faas element for changes to its children
  formObserver.observe(faas, { childList: true, subtree: true });
};

export default async function init(a) {
  if (a.textContent.includes('no-lazy')) {
    loadFaas(a);
  } else {
    createIntersectionObserver({
      el: a,
      options: { rootMargin: `${ROOT_MARGIN}px` },
      callback: loadFaas,
    });
  }
}
