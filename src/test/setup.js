import '@testing-library/jest-dom/vitest';

// jsdom does not implement responsive media queries.
if (!window.matchMedia) {
  window.matchMedia = query => ({
    matches: false, media: query,
    addEventListener() {}, removeEventListener() {},
  });
}
