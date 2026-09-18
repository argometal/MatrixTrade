(function () {
  var navEl = document.getElementById('tbcNav');
  var deckEl = document.getElementById('tbcDeck');
  var titleEl = document.getElementById('tbcPageTitle');
  var subEl = document.getElementById('tbcPageSub');
  var statusEl = document.getElementById('tbcStatus');
  var toastEl = document.getElementById('tbcToast');

  var config = null;
  var activePageId = null;

  function toast(msg, isErr) {
    toastEl.textContent = msg;
    toastEl.style.borderColor = isErr ? '#c62828' : 'var(--border)';
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 3200);
  }

  window.__tbcToast = toast;

  function setStatus(state, text) {
    statusEl.dataset.state = state;
    statusEl.textContent = text;
  }

  function renderPage(pageId) {
    var page = (config.pages || []).find(function (p) {
      return p.id === pageId;
    });
    if (!page) return;
    activePageId = pageId;
    titleEl.textContent = page.title || page.id;
    subEl.textContent = page.subtitle || '';

    navEl.querySelectorAll('.tbc-nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.page === pageId);
    });

    deckEl.innerHTML = '';
    (page.tiles || []).forEach(function (tile) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tbc-tile';
      btn.dataset.id = tile.id;
      if (tile.accent) {
        btn.style.boxShadow =
          'inset 0 0 0 1px ' +
          tile.accent +
          '44, inset 0 1px 0 rgba(255,255,255,.06), 0 4px 12px rgba(0,0,0,.35)';
      }
      var ic = document.createElement('span');
      ic.className = 'tbc-tile-icon';
      ic.textContent = tile.icon || '▸';
      var lb = document.createElement('span');
      lb.className = 'tbc-tile-label';
      lb.textContent = tile.label || tile.id;
      btn.appendChild(ic);
      btn.appendChild(lb);
      if (tile.hint) {
        var h = document.createElement('span');
        h.className = 'tbc-tile-hint';
        h.textContent = tile.hint;
        btn.appendChild(h);
      }
      btn.addEventListener('click', function () {
        runTile(tile.id);
      });
      deckEl.appendChild(btn);
    });
  }

  function runTile(id) {
    setStatus('run', 'Running…');
    fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id })
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      })
      .then(function (_ref) {
        var j = _ref.j;
        var ok = _ref.ok;
        if (j && j.mode === 'openUrl' && j.url) {
          setStatus('ok', 'Ready');
          toast('Opened in browser');
          return;
        }
        if (ok && j && j.ok) {
          setStatus('ok', 'Ready');
          toast('Action sent to the system');
          return;
        }
        setStatus('err', 'Error');
        toast((j && j.error) || 'Action failed', true);
        setTimeout(function () {
          setStatus('ok', 'Ready');
        }, 2000);
      })
      .catch(function (e) {
        setStatus('err', 'Error');
        toast(String(e.message || e), true);
        setTimeout(function () {
          setStatus('ok', 'Ready');
        }, 2000);
      });
  }

  function applyConfig(cfg) {
    config = cfg;
    window.__tbcConfig = cfg;
    document.title = (cfg.name || 'TBC') + ' — Toolbox Companion';
    navEl.innerHTML = '';
    (cfg.pages || []).forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tbc-nav-btn';
      b.dataset.page = p.id;
      b.textContent = p.title || p.id;
      b.addEventListener('click', function () {
        renderPage(p.id);
      });
      navEl.appendChild(b);
    });
    if (cfg.pages && cfg.pages.length) {
      renderPage(cfg.pages[0].id);
    }
  }

  window.__tbcApplyConfig = applyConfig;

  function tryOpenConfigureFromQuery() {
    try {
      var sp = new URLSearchParams(window.location.search || '');
      if (sp.get('configure') !== '1') return;
      setTimeout(function () {
        var btn = document.getElementById('tbcBtnConfigure');
        if (btn) btn.click();
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname || '/');
        }
      }, 120);
    } catch (e) {
      /* ignore */
    }
  }

  fetch('/api/config')
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      applyConfig(cfg);
      tryOpenConfigureFromQuery();
    })
    .catch(function (e) {
      setStatus('err', 'No config');
      toast('Could not load /api/config: ' + e, true);
    });
})();
