import { STATUS, ASSETS_TITLES } from './constants.js';
import { createTag } from '../../../utils/utils.js';

const maxFullWidth = 1920;
const assetsCache = new Map();

export function isViewportTooSmall() {
  return !window.matchMedia('(min-width: 1200px)').matches;
}

export async function checkImageDimensions(url, area) {
  if (isViewportTooSmall()) {
    return {
      title: ASSETS_TITLES.AssetDimensions,
      status: STATUS.EMPTY,
      description: 'Viewport is too small to run asset checks (minimum width: 1200px).',
    };
  }

  if (assetsCache.has(url)) {
    const cachedResult = assetsCache.get(url);
    return JSON.parse(JSON.stringify(cachedResult));
  }

  const allAssets = [...area.querySelectorAll('main picture img, main video')];
  if (!allAssets.length) {
    return {
      title: ASSETS_TITLES.AssetDimensions,
      status: STATUS.EMPTY,
      description: 'No assets found in the main content.',
    };
  }

  await Promise.all(
    allAssets.map((asset) => {
      if (asset.tagName === 'IMG' && !asset.complete) {
        asset.setAttribute('loading', 'eager');
        return new Promise((resolve) => {
          asset.addEventListener('load', resolve);
          asset.addEventListener('error', resolve);
        });
      }

      if (asset.tagName === 'VIDEO' && asset.readyState < 2) {
        return new Promise((resolve) => {
          asset.addEventListener('canplay', resolve);
          asset.addEventListener('error', resolve);
        });
      }

      return Promise.resolve();
    }),
  );

  const assets = allAssets.filter((asset) => asset.checkVisibility()
    && !asset.closest('.icon-area')
    && !asset.src.includes('.svg'));

  if (!assets.length) {
    return {
      title: ASSETS_TITLES.AssetDimensions,
      status: STATUS.EMPTY,
      description: 'No eligible assets found (visible, non-icon, non-SVG).',
    };
  }

  const viewportWidth = area.documentElement.clientWidth;
  const assetsWithMismatch = [];
  const assetsWithMatch = [];

  area.body.classList.add('preflight-assets-analysis');

  for (const asset of assets) {
    // Get the asset type
    const assetType = asset.tagName === 'VIDEO' ? 'video' : 'image';
    // Calculate asset dimensions
    let naturalWidth;
    if (assetType === 'video') naturalWidth = asset.videoWidth;
    else naturalWidth = asset.getAttribute('width') ? parseInt(asset.getAttribute('width'), 10) : asset.naturalWidth;
    let naturalHeight;
    if (assetType === 'video') naturalHeight = asset.videoHeight;
    else naturalHeight = asset.getAttribute('height') ? parseInt(asset.getAttribute('height'), 10) : asset.naturalHeight;
    // Get the display dimensions of the asset
    const displayWidth = asset.offsetWidth;
    const displayHeight = asset.offsetHeight;
    // Check if the asset is full width
    const isFullWidthAsset = displayWidth >= viewportWidth;
    // Define the ideal factor depending on the asset's display width
    let idealFactor = isFullWidthAsset ? 1.5 : 2;
    if (assetType === 'video') idealFactor = 1;
    // Get the multiplication factor depending on asset display width; allow 5% tolerance
    const factorDivisor = isFullWidthAsset ? maxFullWidth : displayWidth;
    const actualFactor = Math.round((naturalWidth / factorDivisor) * 100) / 100;
    const roundedFactor = Math.ceil(actualFactor * 20) / 20;
    // Check if the asset meets the ideal factor
    const hasMismatch = roundedFactor < idealFactor;
    // Define the recommended dimensions
    const recommendedDimensions = isFullWidthAsset
      ? `${maxFullWidth * idealFactor}x${Math.ceil((maxFullWidth * idealFactor * naturalHeight) / naturalWidth)}`
      : `${Math.ceil(displayWidth * idealFactor)}x${Math.ceil(displayHeight * idealFactor)}`;
    // Save the asset data relevant to the final template
    const assetData = {
      assetType,
      src: asset.getAttribute(assetType === 'video' ? 'data-video-source' : 'src'),
      naturalDimensions: `${naturalWidth}x${naturalHeight}`,
      displayDimensions: `${displayWidth}x${displayHeight}`,
      recommendedDimensions,
      roundedFactor,
      hasMismatch,
    };
    // Check for or define an asset meta element to display analysis results
    let assetMetaElem = asset.closest(assetType === 'video' ? '.video-holder' : 'picture').querySelector('.asset-meta');
    if (!assetMetaElem) {
      assetMetaElem = createTag('div', { class: 'asset-meta' });
      asset.closest(assetType === 'video' ? '.video-holder' : 'picture').insertBefore(assetMetaElem, asset.nextSibling);
    }

    const assetMessage = createTag(
      'div',
      { class: `asset-meta-size preflight-decoration ${hasMismatch ? 'has-mismatch' : 'no-mismatch'}` },
      hasMismatch
        ? `Size: too small, use > ${assetData.recommendedDimensions}`
        : 'Size: correct',
    );
    assetMetaElem.append(assetMessage);

    if (hasMismatch) {
      assetsWithMismatch.push(assetData);
    } else {
      assetsWithMatch.push(assetData);
    }
  }

  area.body.classList.remove('preflight-assets-analysis');

  const result = {
    title: ASSETS_TITLES.AssetDimensions,
    status: assetsWithMismatch.length > 0 ? STATUS.FAIL : STATUS.PASS,
    description:
      assetsWithMismatch.length > 0
        ? `${assetsWithMismatch.length} asset(s) have dimension mismatches.`
        : 'All assets have matching dimensions.',
    details: {
      assetsWithMismatch,
      assetsWithMatch,
    },
  };

  if (result.status === STATUS.PASS || result.status === STATUS.FAIL) {
    assetsCache.set(url, JSON.parse(JSON.stringify(result)));
  }

  return result;
}

export function runChecks(url, area) {
  return [checkImageDimensions(url, area)];
}
