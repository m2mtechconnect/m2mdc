type ScrollTarget = Pick<Window, 'dispatchEvent'> & {
  scrollTo: Window['scrollTo'];
  scrollX: number;
  scrollY: number;
  pageXOffset: number;
  pageYOffset: number;
};

/**
 * Installs the scroll behavior JSDOM intentionally leaves unimplemented.
 * Position getters and the scroll event keep the shim useful to interaction
 * tests instead of merely silencing the missing-browser-API error.
 */
export function installWindowScrollShim(target: ScrollTarget = window) {
  let x = 0;
  let y = 0;

  Object.defineProperties(target, {
    scrollX: { configurable: true, get: () => x },
    scrollY: { configurable: true, get: () => y },
    pageXOffset: { configurable: true, get: () => x },
    pageYOffset: { configurable: true, get: () => y },
  });

  target.scrollTo = ((first: number | ScrollToOptions, second?: number) => {
    if (typeof first === 'number') {
      x = Number.isFinite(first) ? first : x;
      y = Number.isFinite(second) ? (second as number) : y;
    } else {
      x = Number.isFinite(first.left) ? (first.left as number) : x;
      y = Number.isFinite(first.top) ? (first.top as number) : y;
    }
    target.dispatchEvent(new Event('scroll'));
  }) as Window['scrollTo'];
}
