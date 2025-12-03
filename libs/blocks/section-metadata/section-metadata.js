import { handleFocalpoint } from '../../utils/decorate.js';
import { createTag, getFedsPlaceholderConfig } from '../../utils/utils.js';

const replacePlaceholder = async (key) => {
  const { replaceKey } = await import('../../features/placeholders.js');
  return replaceKey(key, getFedsPlaceholderConfig());
};
const ADD_MORE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" fill="none"><path fill="#292929" d="M12 24.24c-6.617 0-12-5.383-12-12s5.383-12 12-12 12 5.383 12 12-5.383 12-12 12Zm0-21.943c-5.483 0-9.943 4.46-9.943 9.943s4.46 9.943 9.943 9.943 9.943-4.46 9.943-9.943S17.483 2.297 12 2.297Z"/><path fill="#292929" d="M16.55 11.188h-3.5v-3.5a1.05 1.05 0 0 0-2.1 0v3.5h-3.5a1.05 1.05 0 0 0 0 2.1h3.5v3.5a1.05 1.05 0 0 0 2.1 0v-3.5h3.5a1.05 1.05 0 0 0 0-2.1Z"/></svg>';

const mediaQueries = {
  mobile: window.matchMedia('(max-width: 599px)'),
  tablet: window.matchMedia('(min-width: 600px) and (max-width: 1199px)'),
};

// Same concept could be applied for masonry and other props
export function handleBackground(div, section) {
  let items = [];
  const firstText = div.background.text[0];

  if (firstText?.includes('|')) {
    // Normalize input: convert legacy pipe format into new array structure
    const colors = firstText.split('|').map((c) => c.trim());
    items = colors.map((color) => ({ type: 'color', value: color }));
  } else {
    items = div.background.content.map((el, i) => {
      const pic = el.querySelector('picture');
      const video = el.querySelector('.video-container');
      const text = div.background.text[i]?.trim();
      if (video) return { type: 'video', value: video, el };
      if (pic) return { type: 'image', value: pic, el };
      if (text) return { type: 'color', value: text };
      return null;
    }).filter(Boolean);
  }

  if (items.length === 0) return;

  section.classList.add('has-background');

  const binaryVP = [['mobile-only'], ['tablet-only', 'desktop-only']];
  const allVP = [['mobile-only'], ['tablet-only'], ['desktop-only']];
  const viewports = items.length === 2 ? binaryVP : allVP;

  const bgContainer = createTag('div', { class: 'section-background' });

  items.forEach((item, i) => {
    if (item.type === 'video') {
      if (items.length > 1 && i < viewports.length) {
        item.value.classList.add(...viewports[i]);
      }
      bgContainer.append(item.value);
    } else if (item.type === 'image') {
      if (items.length > 1 && i < viewports.length) {
        item.value.classList.add(...viewports[i]);
      }
      handleFocalpoint(item.value, item.el);
      bgContainer.append(item.value);
    } else if (item.type === 'color') {
      const colorDiv = createTag('div');
      if (items.length > 1 && i < viewports.length) {
        colorDiv.classList.add(...viewports[i]);
      }
      colorDiv.style.background = item.value;
      bgContainer.append(colorDiv);
    }
  });

  section.insertAdjacentElement('afterbegin', bgContainer);
}

export async function handleStyle(text, section) {
  if (!text || !section) return;

  const styleSets = text.filter(Boolean).map((styleText) => (
    styleText.split(', ').map((style) => style.replaceAll(' ', '-'))
  ));

  if (styleSets.length === 0) return;

  // Handle sticky sections from any style set
  const allStyles = styleSets.flat();
  const sticky = allStyles.find((style) => style === 'sticky-top' || style === 'sticky-bottom');
  if (sticky) {
    const { default: handleStickySection } = await import('./sticky-section.js');
    await handleStickySection(sticky, section);
  }

  // Single style set - apply statically (backward compatibility)
  if (styleSets.length === 1) {
    const styles = styleSets[0];
    if (styles.includes('masonry')) styles.push('masonry-up');
    section.classList.add(...styles);
    return;
  }

  // Multiple style sets - apply based on viewport
  const applyStyles = () => {
    let activeIndex = 0;

    if (styleSets.length === 2) {
      // Binary: mobile | tablet+desktop
      activeIndex = mediaQueries.mobile.matches ? 0 : 1;
    } else if (styleSets.length >= 3) {
      // Full: mobile | tablet | desktop
      if (mediaQueries.mobile.matches) {
        activeIndex = 0;
      } else if (mediaQueries.tablet.matches) {
        activeIndex = 1;
      } else {
        activeIndex = 2;
      }
    }

    // Remove all style classes from all sets
    styleSets.forEach((styleSet) => {
      section.classList.remove(...styleSet);
    });

    // Apply active style set
    const activeStyles = styleSets[activeIndex];
    if (activeStyles.includes('masonry')) activeStyles.push('masonry-up');
    section.classList.add(...activeStyles);
  };

  // Apply initial styles
  applyStyles();

  // Add listeners for viewport changes
  Object.keys(mediaQueries).forEach((key) => {
    mediaQueries[key].addEventListener('change', applyStyles);
  });
}

function handleMasonry(text, section) {
  section.classList.add(...['masonry-layout', 'masonry-up']);
  const divs = section.querySelectorAll(":scope > div:not([class*='metadata'])");
  const spans = [];
  text.split('\n').forEach((line) => spans.push(...line.trim().split(',')));
  [...divs].forEach((div, i) => {
    const spanWidth = spans[i] ? spans[i] : 'span 4';
    div.classList.add(`grid-${spanWidth.trim().replace(' ', '-')}`);
  });
}

function handleLayout(text, section) {
  if (!(text || section)) return;
  const layoutClass = `grid-template-columns-${text.replaceAll(' | ', '-')}`;
  section.classList.add(layoutClass);
}

export function getDelayTime(time) {
  if (time > 99) return time;
  return (time * 1000);
}

function handleDelay(time, section) {
  if (!(time || section)) return;
  section.classList.add('hide-sticky-section');
  setTimeout(() => { section.classList.remove('hide-sticky-section'); }, getDelayTime(time));
}

function handleAnchor(anchor, section) {
  if (!anchor || !section) return;
  section.id = anchor.toLowerCase().trim().replaceAll(/\s+/g, '-');
  section.classList.add('section-anchor');
}

export const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = [...row.children].slice(1);
    const text = content.map((bp) => bp.textContent?.trim().toLowerCase());
    if (key && content) rdx[key] = { content, text };
  }
  return rdx;
}, {});

async function createAndConfigureShowMoreButton(section, cardsCount) {
  const seeMoreText = await replacePlaceholder('see-more-features');
  const showMoreButton = createTag(
    'div',
    { class: `show-more-button${cardsCount <= 3 ? ' hidden' : ''}` },
  );
  const button = createTag('button', {}, seeMoreText);

  const iconSpan = createTag('span', {
    class: 'show-more-icon',
    'aria-hidden': 'true',
  }, `${ADD_MORE_ICON}`);
  button.appendChild(iconSpan);

  button.addEventListener('click', () => {
    section.classList.add('show-all');
    section.querySelector('.show-more-button').remove();
  });

  showMoreButton.append(button);
  return showMoreButton;
}

async function handleCollapseSection(section) {
  if (!section) return;
  const blocks = section.querySelectorAll(':scope > div:not(:last-child)');
  const showMoreButton = await createAndConfigureShowMoreButton(section, blocks.length);
  section.append(showMoreButton);
  const { decorateDefaultLinkAnalytics } = await import('../../martech/attributes.js');
  decorateDefaultLinkAnalytics(showMoreButton);
}

function addListAttrToSection(section) {
  if (!section) return;
  const isSectionUp = [...section.classList].some((c) => c.endsWith('-up'));
  const hasHeader = section.querySelector('h1, h2, h3, h4, h5, h6');
  const allowedBlocks = ['icon-block', 'action-item', 'section-metadata'];
  const hasAllowedChildren = [...section.children]
    .every((child) => allowedBlocks.some((block) => child.classList.contains(block)));
  if (!isSectionUp || hasHeader || !hasAllowedChildren) return;
  section.setAttribute('role', 'list');
  [...section.children].forEach((child) => {
    if (child.classList.contains('section-metadata')) return;
    child.setAttribute('role', 'listitem');
  });
}

export default async function init(el) {
  const section = el.closest('.section');
  const metadata = getMetadata(el);
  if (metadata.style) await handleStyle(metadata.style.text, section);
  if (metadata.background) handleBackground(metadata, section);
  if (metadata.layout) handleLayout(metadata.layout.text[0], section);
  if (metadata.masonry) handleMasonry(metadata.masonry.text[0], section);
  if (metadata.delay) handleDelay(metadata.delay.text[0], section);
  if (metadata.anchor) handleAnchor(metadata.anchor.text[0], section);
  if (metadata['collapse-ups-mobile']?.text[0] === 'on') await handleCollapseSection(section);
  addListAttrToSection(section);
}
