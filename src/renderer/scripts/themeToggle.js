(function() {
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function updateToggleIcon(theme) {
    var iconEl = document.getElementById('theme-icon');
    if (iconEl) {
      if (theme === 'dark') {
        iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      } else {
        iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
      }
    }
  }

  function setTheme(theme, save) {
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleIcon(theme);
    if (save) {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {
        // localStorage not available
      }
    }
  }

  function init() {
    var toggleBtn = document.getElementById('theme-toggle-btn');
    var currentTheme = getCurrentTheme();

    // 초기 아이콘 설정
    updateToggleIcon(currentTheme);

    // 초기 로드 transition 비활성화 해제
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        document.documentElement.classList.remove('no-transition');
      });
    });

    // 토글 버튼 클릭 핸들러
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        var current = getCurrentTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        setTheme(next, true);
      });
    }

    // OS 테마 변경 감지
    try {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', function(e) {
          var hasUserPref;
          try {
            hasUserPref = localStorage.getItem('theme');
          } catch (err) {
            hasUserPref = null;
          }
          if (!hasUserPref) {
            var newTheme = e.matches ? 'dark' : 'light';
            setTheme(newTheme, false);
          }
        });
    } catch (e) {
      // matchMedia not available
    }
  }

  // DOMContentLoaded 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
