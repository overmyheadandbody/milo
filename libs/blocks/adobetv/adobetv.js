import { decorateAnchorVideo } from '../../utils/decorate.js';
import { createIntersectionObserver } from '../../utils/utils.js';

export default function init(a) {
  a.classList.add('hide-video');
  const bgBlocks = ['aside', 'marquee', 'hero-marquee'];
  if (a.href.includes('.mp4') && bgBlocks.some((b) => a.closest(`.${b}`))) {
    a.classList.add('hide');
    if (!a.parentNode) return;
    decorateAnchorVideo({
      src: a.href,
      anchorTag: a,
    });
  } else {
    const embed = `<div class="milo-video">
      <iframe src="${a.href}" class="adobetv" webkitallowfullscreen mozallowfullscreen allowfullscreen scrolling="no" allow="encrypted-media" title="Adobe Video Publishing Cloud Player" loading="lazy">
      </iframe>
    </div>`;
    a.insertAdjacentHTML('afterend', embed);

    const vidFrame = a.parentElement.querySelector('iframe'); // enhance selector

    // MPC docs at https://publish.tv.adobe.com/docs
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://video.tv.adobe.com') return;
      if (!vidFrame.src.startsWith(`${event.origin}/v/${event?.data?.id}`)) return;

      if (event?.data?.state === 'play') vidFrame.setAttribute('data-playing', true);
      if (event?.data?.state === 'pause') vidFrame.setAttribute('data-playing', false);
    });

    createIntersectionObserver({
      el: vidFrame,
      options: { rootMargin: '0px' },
      once: false,
      newCallback: (target, entry) => {
        if (!entry.isIntersecting && target.getAttribute('data-playing') === 'true') {
          console.log('pausing MPC');
          target.contentWindow.postMessage({ type: 'mpcAction', action: 'pause' }, target.src);
        }
      },
    });

    a.remove();
  }
}
