import { createTag, parseEncodedConfig, createIntersectionObserver } from '../../utils/utils.js';
import { initFaas, loadFaasFiles } from './utils.js';

const ROOT_MARGIN = 1000;

const [createLiveRegion, updateLiveRegion] = (() => {
  let ariaLiveRegion;

  return [
    (form) => {
      ariaLiveRegion = createTag('div', {
        'aria-live': 'polite',
        role: 'status',
        class: 'faas-aria-live-region',
      });
      form.prepend(ariaLiveRegion);

      return ariaLiveRegion;
    },
    (errorMessage) => {
      if (!ariaLiveRegion || !errorMessage?.length) return;
      ariaLiveRegion.textContent = errorMessage;

      setTimeout(() => {
        ariaLiveRegion.textContent = '';
      }, 3000);
    },
  ];
})();

const createValidationObserver = () => new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return;

    const rowElement = mutation.target;

    // If the field becomes valid, remove the aria-describedby attribute
    if (rowElement.classList.contains('success')) {
      [...rowElement.querySelectorAll('[id][name]')].forEach((field) => {
        field.removeAttribute('aria-describedby');
      });
    }

    if (!rowElement.classList.contains('error')) return;

    // If the field becomes invalid, add the aria-describedby attribute
    [...rowElement.querySelectorAll('[id][name]')].forEach((field) => {
      const { id } = field;
      field.setAttribute('aria-describedby', `${id}_em_`);
    });

    // Update the live region with the error message
    const errorMessage = rowElement.querySelector('.errorMessage');
    updateLiveRegion(errorMessage?.textContent);
  });
});

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
    createLiveRegion(faasForm);

    // Set up a MutationObserver to watch for validation classes on rows
    const validationObserver = createValidationObserver();

    // Find all row elements and observe them for class changes
    [...faasForm.querySelectorAll('.row')].forEach((row) => {
      validationObserver.observe(row, { attributes: true, attributeFilter: ['class'] });
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
