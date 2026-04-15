import { decorateBlockText, decorateViewportContent } from '../../../utils/decorate.js';
import { createTag, getFederatedUrl } from '../../../utils/utils.js';

const isSvgUrl = (url) => /\.svg(\?.*)?$/i.test(url || '');

function markStandaloneLinks(el) {
  el.querySelectorAll('a').forEach((a) => {
    const parent = a.parentElement;
    if (!parent) return;
    if (parent.textContent?.trim() === a.textContent?.trim()) {
      a.classList.add('standalone-link', 'label');
    }
  });
}

function extractIcon(foreground, media) {
  const firstCell = foreground.children[0];
  if (!firstCell) return;

  // Case 1: icon as <picture> (EDS-processed raster image)
  if (firstCell.childElementCount === 1 && firstCell.firstElementChild?.tagName === 'PICTURE') {
    const iconPicture = firstCell.firstElementChild;
    const iconImg = iconPicture.querySelector('img');
    if (iconImg?.hasAttribute('src') && isSvgUrl(iconImg.src)) {
      iconImg.src = getFederatedUrl(iconImg.getAttribute('src'));
    }
    iconPicture.classList.add('icon');
    media.appendChild(iconPicture);
    firstCell.remove();
    return;
  }

  // Case 2: icon as <a> link (EDS converts SVGs from DA to links)
  const iconLink = firstCell.querySelector('a:only-child');
  if (!iconLink) return;
  const heading = foreground.querySelector('h1, h2, h3, h4, h5, h6');
  const isBeforeHeading = heading
    && (firstCell.compareDocumentPosition(heading) === Node.DOCUMENT_POSITION_FOLLOWING);
  if (isBeforeHeading) {
    const icon = createTag('img', {
      src: iconLink.href,
      alt: iconLink.textContent || '',
      width: '24',
      height: '24',
    });
    const iconWrap = createTag('picture', { class: 'icon' }, icon);
    media.appendChild(iconWrap);
    firstCell.remove();
  }
}

function decorateContent(block) {
  const row = block.children[0];
  const foreground = row?.children[0];
  const media = row?.children[1];
  if (!foreground) return;

  foreground.classList.add('foreground');

  if (media) {
    media.classList.add('media');
    extractIcon(foreground, media);
  }

  decorateBlockText(foreground, { heading: '4' });
  markStandaloneLinks(foreground);
}

export default function init(el) {
  decorateViewportContent(el, decorateContent);
}

