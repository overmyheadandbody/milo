import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import { setConfig } from '../../../libs/utils/utils.js';

const conf = {
  codeRoot: '/libs',
  contentRoot: `${window.location.origin}`,
};
setConfig(conf);

document.body.innerHTML = await readFile({ path: './mocks/body.html' });
const { default: init } = await import('../../../libs/blocks/text/text.js');

describe('text block', () => {
  const textBlocks = document.querySelectorAll('.text');
  textBlocks.forEach((textBlock) => {
    init(textBlock);
  });
  describe('full-width text block medium heading', () => {
    it('has a medium heading', () => {
      const heading = textBlocks[0].querySelector('.heading-l');
      expect(heading).to.exist;
    });

    it('has body copy', () => {
      const body = textBlocks[0].querySelector('[class*="body-"]');
      expect(body).to.exist;
    });
  });
  describe('full-width text block large heading', () => {
    it('has a large heading', () => {
      const heading = textBlocks[1].querySelector('.heading-xl');
      expect(heading).to.exist;
    });

    it('has body copy', () => {
      const body = textBlocks[1].querySelector('[class*="body-"]');
      expect(body).to.exist;
    });
  });
  describe('text block legal', () => {
    it('is present', () => {
      const element = document.querySelector('.legal');
      expect(element).to.exist;
    });
    it('has xxs body copy', () => {
      const body = document.querySelector('.legal .body-xxs');
      expect(body).to.exist;
    });
  });
  describe('Link Farm', () => {
    it('is present', () => {
      const element = document.querySelector('.link-farm');
      expect(element).to.exist;
    });

    it('adds h3 elements when necessary', () => {
      const headingElements = document.querySelectorAll('.link-farm .foreground h3');
      expect(headingElements.length).to.equal(4);
    });
    it('adds no-heading class to the h3 element', () => {
      const headingElem = document.querySelector('.link-farm .foreground .no-heading');
      expect(headingElem).to.exist;
    });
    it('adds h3 as the first element in the div', () => {
      const divElements = document.querySelectorAll('.link-farm .foreground:nth-child(2) div');
      divElements.forEach((div) => {
        expect(div.children[0].tagName).to.equal('H3');
      });
    });
  });
  describe('two content rows', () => {
    it('has viewport classes', () => {
      const mobileEl = document.querySelector('.text-block .mobile-up');
      expect(mobileEl).to.exist;
    });
  });
  describe('cta container', () => {
    it('is added around the last action area', () => {
      const actionArea = document.querySelector('#has-container');
      expect(actionArea.parentElement.className.includes('cta-container')).to.be.true;
    });
    it('is not added around action areas that are not last', () => {
      const actionArea = document.querySelector('#no-container');
      expect(actionArea.parentElement.className.includes('cta-container')).to.be.false;
    });
  });
  describe('text block with mnemonics list', () => {
    it('renders mnemonics list', async () => {
      const textBlockWithMnemonics = document.querySelector('#mnemonics');
      await init(textBlockWithMnemonics);
      const mnemonicsList = textBlockWithMnemonics.querySelector('.mnemonic-list');
      const productList = mnemonicsList?.querySelector('.product-list');
      const productItems = productList?.querySelectorAll('.product-item');
      expect(mnemonicsList).to.exist;
      expect(productList).to.exist;
      expect(productItems.length).to.equal(7);
    });
  });
});
