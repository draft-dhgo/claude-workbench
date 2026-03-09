(function() {
  var saved;
  try {
    saved = localStorage.getItem('theme');
  } catch (e) {
    saved = null;
  }
  if (!saved) {
    try {
      saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      saved = 'dark';
    }
  }
  document.documentElement.setAttribute('data-theme', saved);
  document.documentElement.classList.add('no-transition');
})();
