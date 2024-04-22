import jsdom from 'jsdom';

export function stringToDom(str) {
  const dom = new jsdom.JSDOM(str);
  return dom.window.document;
}

