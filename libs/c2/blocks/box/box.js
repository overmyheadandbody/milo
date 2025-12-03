import { createTag } from '../../../utils/utils.js';

function decorate(el) {
  const innerElem = createTag('div', { class: 'box-inner' });
  el.appendChild(innerElem);
}

export default function init(el) {
  decorate(el);
}
