export default async function init(el) {
  const outlierLink = el.querySelector('a[href*="#_copyOutliers"]');
  if (!outlierLink) return;
  const outlierBookmarkletStr = `javascript:(function(){const list = [];document.querySelectorAll('table[aria-labelledby="folders-and-files"] tbody tr.react-directory-row .react-directory-row-name-cell-large-screen .react-directory-filename-column').forEach(folder => list.push(folder.innerText));navigator.clipboard.writeText(list);console.log(list)})();`;
  outlierLink.href = outlierBookmarkletStr;
}
