// Offline browser/build checks only. Production still uses the real font files.
module.exports = new Proxy({}, {
  get: (_target, url) => `@font-face { font-family: '${String(url).includes('Geist+Mono') ? 'Geist Mono' : 'Geist'}'; font-style: normal; font-weight: 100 900; src: local('Arial'); }`,
});
