(function() {
  let _locale = {};
  let _lang = 'en';

  try {
    _lang = localStorage.getItem('app-lang') || 'en';
  } catch (e) {
    _lang = 'en';
  }

  async function loadLocale(lang) {
    try {
      const res = await fetch(`locales/${lang}.json`);
      if (!res.ok) throw new Error('Failed to load locale: ' + lang);
      _locale = await res.json();
      _lang = lang;
      try {
        localStorage.setItem('app-lang', lang);
      } catch (e) {
        // localStorage not available
      }
    } catch (e) {
      console.warn('[i18n] Could not load locale:', lang, e);
    }
  }

  function t(key, params) {
    let str = _locale[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
      }
    }
    return str;
  }

  function applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  async function setLang(lang) {
    await loadLocale(lang);
    applyAll();
    const sel = document.getElementById('lang-select');
    if (sel) sel.value = lang;
    document.documentElement.lang = lang;
  }

  async function init() {
    await loadLocale(_lang);
    applyAll();
    const sel = document.getElementById('lang-select');
    if (sel) {
      sel.value = _lang;
      sel.addEventListener('change', function() {
        setLang(sel.value);
      });
    }
    document.documentElement.lang = _lang;
  }

  window.i18n = {
    get currentLang() { return _lang; },
    t: t,
    setLang: setLang,
    init: init,
    applyAll: applyAll
  };
})();
