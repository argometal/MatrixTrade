/*!
 * ORM (Alexandria-style): `ORM/ORM-00-Index.md`.
 */
(function () {
  'use strict';

  var overlay = null;
  var draft = null;
  var pageIdx = 0;
  var editingTile = null;
  var onApplied = null;
  var toastFn = null;

  function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderPageList() {
    var box = document.getElementById('tbcPageList');
    if (!box) return;
    box.innerHTML = '';
    (draft.pages || []).forEach(function (p, i) {
      var row = el('div', 'tbc-editor-page-row');
      var btn = el('button', 'tbc-editor-page-tab' + (i === pageIdx ? ' active' : ''), p.title || p.id);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        readPageFields();
        pageIdx = i;
        renderPageList();
        renderPageFields();
        refreshTileListAndLauncherGrid();
      });
      row.appendChild(btn);
      var del = el('button', 'tbc-editor-iconbtn', '×');
      del.type = 'button';
      del.title = 'Remove page';
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (!confirm('Remove page "' + (p.title || p.id) + '" and all its tiles?')) return;
        readPageFields();
        draft.pages.splice(i, 1);
        if (!draft.pages.length) {
          draft.pages.push({
            id: 'main',
            title: 'Main',
            subtitle: '',
            tiles: []
          });
          pageIdx = 0;
        } else {
          if (i < pageIdx) pageIdx--;
          else if (i === pageIdx) pageIdx = Math.min(pageIdx, draft.pages.length - 1);
        }
        renderPageList();
        renderPageFields();
        refreshTileListAndLauncherGrid();
      });
      row.appendChild(del);
      box.appendChild(row);
    });
  }

  function renderPageFields() {
    var p = draft.pages[pageIdx];
    if (!p) return;
    var titleIn = document.getElementById('tbcPageTitleIn');
    var subIn = document.getElementById('tbcPageSubIn');
    var idIn = document.getElementById('tbcPageIdIn');
    if (titleIn) titleIn.value = p.title || '';
    if (subIn) subIn.value = p.subtitle || '';
    if (idIn) idIn.value = p.id || '';
  }

  function readPageFields() {
    var p = draft.pages[pageIdx];
    if (!p) return;
    var titleIn = document.getElementById('tbcPageTitleIn');
    var subIn = document.getElementById('tbcPageSubIn');
    var idIn = document.getElementById('tbcPageIdIn');
    if (titleIn) p.title = titleIn.value.trim() || p.id;
    if (subIn) p.subtitle = subIn.value.trim();
    if (idIn) {
      var nid = idIn.value.trim().replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      if (nid) p.id = nid;
    }
  }

  function renderTileList() {
    var box = document.getElementById('tbcTileList');
    if (!box) return;
    box.innerHTML = '';
    var p = draft.pages[pageIdx];
    if (!p) return;
    (p.tiles || []).forEach(function (t, ti) {
      var card = el('div', 'tbc-editor-tile-card');
      var top = el('div', 'tbc-editor-tile-top');
      top.appendChild(el('span', 'tbc-editor-tile-ico', t.icon || '▸'));
      var mid = el('div', 'tbc-editor-tile-mid');
      mid.appendChild(el('strong', null, t.label || t.id));
      var sub = el('span', 'tbc-editor-tile-kind', (t.kind || 'open') + '');
      mid.appendChild(sub);
      top.appendChild(mid);
      card.appendChild(top);
      var actions = el('div', 'tbc-editor-tile-actions');
      var up = el('button', 'tbc-editor-small', 'Up');
      up.type = 'button';
      up.disabled = ti === 0;
      up.addEventListener('click', function () {
        if (ti > 0) {
          var arr = p.tiles;
          var x = arr[ti - 1];
          arr[ti - 1] = arr[ti];
          arr[ti] = x;
          refreshTileListAndLauncherGrid();
        }
      });
      var dn = el('button', 'tbc-editor-small', 'Down');
      dn.type = 'button';
      dn.disabled = ti === p.tiles.length - 1;
      dn.addEventListener('click', function () {
        if (ti < p.tiles.length - 1) {
          var arr = p.tiles;
          var x = arr[ti + 1];
          arr[ti + 1] = arr[ti];
          arr[ti] = x;
          refreshTileListAndLauncherGrid();
        }
      });
      var ed = el('button', 'tbc-editor-small primary', 'Edit');
      ed.type = 'button';
      ed.addEventListener('click', function () {
        readPageFields();
        openTileModal(pageIdx, ti);
      });
      var rm = el('button', 'tbc-editor-small danger', 'Remove');
      rm.type = 'button';
      rm.addEventListener('click', function () {
        if (!confirm('Remove tile "' + (t.label || t.id) + '"?')) return;
        p.tiles.splice(ti, 1);
        refreshTileListAndLauncherGrid();
      });
      actions.appendChild(up);
      actions.appendChild(dn);
      actions.appendChild(ed);
      actions.appendChild(rm);
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  function renderMacroList() {
    var box = document.getElementById('tbcMacroList');
    if (!box) return;
    box.innerHTML = '';
    draft.macros = draft.macros || {};
    Object.keys(draft.macros).forEach(function (key) {
      addMacroRow(key, draft.macros[key]);
    });
  }

  function addMacroRow(key, val) {
    var box = document.getElementById('tbcMacroList');
    if (!box) return;
    var row = el('div', 'tbc-editor-macro-row');
    var k = el('input', 'tbc-editor-inp');
    k.type = 'text';
    k.placeholder = 'NAME';
    k.value = key || '';
    var v = el('input', 'tbc-editor-inp wide');
    v.type = 'text';
    v.placeholder = 'C:\\path or value';
    v.value = val || '';
    var rm = el('button', 'tbc-editor-iconbtn', '×');
    rm.type = 'button';
    rm.addEventListener('click', function () {
      row.remove();
    });
    row.appendChild(k);
    row.appendChild(v);
    row.appendChild(rm);
    box.appendChild(row);
  }

  function collectMacros() {
    var out = {};
    var box = document.getElementById('tbcMacroList');
    if (!box) return out;
    box.querySelectorAll('.tbc-editor-macro-row').forEach(function (row) {
      var inputs = row.querySelectorAll('input');
      if (inputs.length < 2) return;
      var k = inputs[0].value.trim();
      var v = inputs[1].value;
      if (k) out[k] = v;
    });
    return out;
  }

  function refreshTileListAndLauncherGrid() {
    renderTileList();
    renderLauncherGridEditor();
  }

  function clampInt(n, lo, hi, fallback) {
    var x = parseInt(n, 10);
    if (Number.isNaN(x)) return fallback;
    return Math.max(lo, Math.min(hi, x));
  }

  function migrateLegacyLauncherGrid() {
    if (draft.launcherGrid) return;
    if (draft.streamdeck && typeof draft.streamdeck === 'object') {
      draft.launcherGrid = deepClone(draft.streamdeck);
      delete draft.streamdeck;
    }
  }

  function allTileRefs() {
    var out = [];
    (draft.pages || []).forEach(function (p) {
      (p.tiles || []).forEach(function (t) {
        out.push({ id: t.id, label: t.label || t.id });
      });
    });
    return out;
  }

  function defaultLauncherLayout() {
    var ids = [];
    (draft.pages || []).forEach(function (p) {
      (p.tiles || []).forEach(function (t) {
        ids.push(t.id);
      });
    });
    var cols = 5;
    var n = ids.length;
    var rows = n ? Math.max(1, Math.ceil(n / cols)) : 1;
    var need = cols * rows;
    var cells = [];
    for (var i = 0; i < need; i++) {
      cells.push(ids[i] ? { tileId: ids[i] } : null);
    }
    return { columns: cols, rows: rows, cells: cells };
  }

  function renderLauncherGridEditor() {
    migrateLegacyLauncherGrid();
    var chk = document.getElementById('tbcLgCustomEnabled');
    var body = document.getElementById('tbcLgEditorBody');
    var hint = document.getElementById('tbcLgAutoHint');
    var box = document.getElementById('tbcLgCellGrid');
    var colsIn = document.getElementById('tbcLgCols');
    var rowsIn = document.getElementById('tbcLgRows');
    if (!chk || !body || !hint || !box) return;

    var custom = !!draft.launcherGrid;
    chk.checked = custom;
    hint.style.display = custom ? 'none' : 'block';
    body.hidden = !custom;

    if (!custom) {
      box.innerHTML = '';
      if (colsIn) colsIn.disabled = true;
      if (rowsIn) rowsIn.disabled = true;
      return;
    }

    if (colsIn) colsIn.disabled = false;
    if (rowsIn) rowsIn.disabled = false;

    var opts = allTileRefs();
    var prevMap = {};
    try {
      document.querySelectorAll('#tbcLgCellGrid select[data-slot]').forEach(function (sel) {
        var si = parseInt(sel.getAttribute('data-slot'), 10);
        prevMap[si] = String(sel.value || '').trim();
      });
    } catch (e) {
      /* ignore */
    }

    var lg = draft.launcherGrid;
    var cols = clampInt(parseInt(lg.columns, 10), 1, 16, 5);
    var rows = clampInt(parseInt(lg.rows, 10), 1, 16, 1);
    if (colsIn) colsIn.value = String(cols);
    if (rowsIn) rowsIn.value = String(rows);
    var need = cols * rows;
    var cells = Array.isArray(lg.cells) ? lg.cells.slice() : [];
    while (cells.length < need) cells.push(null);
    if (cells.length > need) cells = cells.slice(0, need);

    box.innerHTML = '';
    var colCss = Math.min(cols, 8);
    box.style.gridTemplateColumns = 'repeat(' + colCss + ', minmax(120px, 1fr))';

    for (var slot = 0; slot < need; slot++) {
      var wrap = el('div', 'tbc-lg-slot', null);
      wrap.appendChild(el('span', null, 'slot ' + slot));
      var sel = document.createElement('select');
      sel.setAttribute('data-slot', String(slot));
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = '— empty —';
      sel.appendChild(o0);
      opts.forEach(function (t) {
        var o = document.createElement('option');
        o.value = t.id;
        o.textContent = t.label + ' (' + t.id + ')';
        sel.appendChild(o);
      });
      var tid = prevMap[slot];
      if (!tid && cells[slot] && cells[slot].tileId) tid = String(cells[slot].tileId);
      if (tid && opts.some(function (x) { return x.id === tid; })) sel.value = tid;
      else sel.value = '';
      wrap.appendChild(sel);
      box.appendChild(wrap);
    }
  }

  function applyLauncherDimsFromToolbar() {
    migrateLegacyLauncherGrid();
    if (!draft.launcherGrid) draft.launcherGrid = defaultLauncherLayout();
    var oldCols = clampInt(parseInt(draft.launcherGrid.columns, 10), 1, 16, 5);
    var oldRows = clampInt(parseInt(draft.launcherGrid.rows, 10), 1, 16, 1);
    var oldNeed = oldCols * oldRows;
    var ordered = [];
    for (var i = 0; i < oldNeed; i++) {
      var sel = document.querySelector('#tbcLgCellGrid select[data-slot="' + i + '"]');
      var v = sel ? String(sel.value || '').trim() : '';
      if (!v && draft.launcherGrid.cells && draft.launcherGrid.cells[i] && draft.launcherGrid.cells[i].tileId) {
        v = String(draft.launcherGrid.cells[i].tileId);
      }
      if (v) ordered.push(v);
    }
    var cols = clampInt(parseInt(document.getElementById('tbcLgCols').value, 10), 1, 16, 5);
    var rows = clampInt(parseInt(document.getElementById('tbcLgRows').value, 10), 1, 16, 1);
    var need = cols * rows;
    var newCells = [];
    for (var j = 0; j < need; j++) {
      newCells.push(ordered[j] ? { tileId: ordered[j] } : null);
    }
    draft.launcherGrid = { columns: cols, rows: rows, cells: newCells };
    renderLauncherGridEditor();
  }

  function fillLauncherGridFromAllTiles() {
    draft.launcherGrid = defaultLauncherLayout();
    var chk = document.getElementById('tbcLgCustomEnabled');
    if (chk) chk.checked = true;
    renderLauncherGridEditor();
  }

  function clearLauncherGridCustom() {
    delete draft.launcherGrid;
    if (draft.streamdeck) delete draft.streamdeck;
    renderLauncherGridEditor();
  }

  function readLauncherGridIntoDraft() {
    var chk = document.getElementById('tbcLgCustomEnabled');
    if (!chk || !chk.checked) {
      delete draft.launcherGrid;
      if (draft.streamdeck) delete draft.streamdeck;
      return;
    }
    var cols = clampInt(parseInt(document.getElementById('tbcLgCols').value, 10), 1, 16, 5);
    var rows = clampInt(parseInt(document.getElementById('tbcLgRows').value, 10), 1, 16, 1);
    var need = cols * rows;
    var cells = [];
    for (var i = 0; i < need; i++) {
      var sel = document.querySelector('#tbcLgCellGrid select[data-slot="' + i + '"]');
      var v = sel ? String(sel.value || '').trim() : '';
      cells.push(v ? { tileId: v } : null);
    }
    draft.launcherGrid = { columns: cols, rows: rows, cells: cells };
    if (draft.streamdeck) delete draft.streamdeck;
  }

  function openTileModal(pi, ti) {
    editingTile = { pi: pi, ti: ti };
    var p = draft.pages[pi];
    var t = p.tiles[ti];
    if (t.kind === 'mouse') {
      t.kind = 'open';
      delete t.mouse;
      if (!t.target) t.target = '';
      toastFn('El tipo "mouse" ya no está en TBC; usa C:\\Tools\\mouse-sim. Este tile quedó como "Open" — indica ruta o URL.', true);
    }
    var modal = document.getElementById('tbcTileModal');
    if (!modal) return;
    document.getElementById('tbcTileIdIn').value = t.id || '';
    document.getElementById('tbcTileLabelIn').value = t.label || '';
    document.getElementById('tbcTileIconIn').value = t.icon || '';
    document.getElementById('tbcTileKindIn').value = t.kind || 'open';
    document.getElementById('tbcTileTargetIn').value = t.target || '';
    document.getElementById('tbcTileTargetsIn').value = Array.isArray(t.targets) ? t.targets.join('\n') : '';
    document.getElementById('tbcTileHintIn').value = t.hint || '';
    document.getElementById('tbcTileAccentIn').value = t.accent || '#444444';
    syncKindFields();
    modal.hidden = false;
  }

  function closeTileModal() {
    var modal = document.getElementById('tbcTileModal');
    if (modal) modal.hidden = true;
    editingTile = null;
  }

  function insertAtCursor(el, text) {
    if (!el) return;
    var val = el.value || '';
    var start = typeof el.selectionStart === 'number' ? el.selectionStart : val.length;
    var end = typeof el.selectionEnd === 'number' ? el.selectionEnd : val.length;
    el.value = val.slice(0, start) + text + val.slice(end);
    var pos = start + text.length;
    if (typeof el.setSelectionRange === 'function') {
      el.setSelectionRange(pos, pos);
    }
    el.focus();
  }

  function refreshMacroInsertBar() {
    var bar = document.getElementById('tbcMacroInsertBar');
    if (!bar) return;
    bar.innerHTML = '';
    if (!draft || !draft.macros) return;
    var keys = Object.keys(draft.macros).filter(function (k) {
      return k && String(k).trim();
    });
    keys.sort();
    if (!keys.length) {
      var empty = document.createElement('span');
      empty.className = 'tbc-editor-tile-kind';
      empty.textContent = 'No macros defined yet.';
      bar.appendChild(empty);
      return;
    }
    keys.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tbc-macro-chip';
      b.textContent = k;
      b.title = 'Insert {{' + k + '}} at cursor';
      b.addEventListener('click', function () {
        var kind = document.getElementById('tbcTileKindIn').value;
        var el =
          kind === 'multi'
            ? document.getElementById('tbcTileTargetsIn')
            : document.getElementById('tbcTileTargetIn');
        insertAtCursor(el, '{{' + k + '}}');
      });
      bar.appendChild(b);
    });
  }

  function syncKindFields() {
    var kind = document.getElementById('tbcTileKindIn').value;
    var single = document.getElementById('tbcTileTargetWrap');
    var multi = document.getElementById('tbcTileTargetsWrap');
    if (single) single.style.display = kind === 'multi' ? 'none' : 'block';
    if (multi) multi.style.display = kind === 'multi' ? 'block' : 'none';
    refreshMacroInsertBar();
  }

  function saveTileModal() {
    if (!editingTile) return;
    var pi = editingTile.pi;
    var ti = editingTile.ti;
    var t = draft.pages[pi].tiles[ti];
    var id = document.getElementById('tbcTileIdIn').value.trim().replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    if (!id) {
      toastFn('Tile id is required', true);
      return;
    }
    t.id = id;
    t.label = document.getElementById('tbcTileLabelIn').value.trim() || id;
    t.icon = document.getElementById('tbcTileIconIn').value.trim() || '📌';
    t.kind = document.getElementById('tbcTileKindIn').value;
    var hint = document.getElementById('tbcTileHintIn').value.trim();
    if (hint) t.hint = hint;
    else delete t.hint;
    var ac = document.getElementById('tbcTileAccentIn').value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(ac)) t.accent = ac;
    else delete t.accent;
    if (t.kind === 'multi') {
      delete t.target;
      t.targets = document
        .getElementById('tbcTileTargetsIn')
        .value.split(/\r?\n/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    } else {
      delete t.targets;
      t.target = document.getElementById('tbcTileTargetIn').value.trim();
    }
    closeTileModal();
    refreshTileListAndLauncherGrid();
  }

  function open(cfg, applyCallback, toast) {
    onApplied = applyCallback;
    toastFn = toast;
    draft = deepClone(cfg);
    overlay = document.getElementById('tbcConfigOverlay');
    if (!overlay) return;
    pageIdx = 0;
    overlay.hidden = false;
    renderPageList();
    renderPageFields();
    refreshTileListAndLauncherGrid();
    renderMacroList();
    document.getElementById('tbcAppNameIn').value = draft.name || 'TBC';
  }

  function close() {
    if (overlay) overlay.hidden = true;
    draft = null;
    closeTileModal();
  }

  function save() {
    readPageFields();
    draft.macros = collectMacros();
    readLauncherGridIntoDraft();
    draft.name = (document.getElementById('tbcAppNameIn').value || '').trim() || 'TBC';

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      })
      .then(function (x) {
        if (!x.ok || !x.j.ok) {
          toastFn((x.j && x.j.error) || 'Save failed', true);
          return;
        }
        toastFn('Saved');
        close();
        if (onApplied && x.j.config) onApplied(x.j.config);
      })
      .catch(function (e) {
        toastFn(String(e.message || e), true);
      });
  }

  function init() {
    var btn = document.getElementById('tbcBtnConfigure');
    if (btn) {
      btn.addEventListener('click', function () {
        if (!window.__tbcConfig) {
          if (window.__tbcToast) window.__tbcToast('Still loading. Try again in a moment.', true);
          return;
        }
        open(window.__tbcConfig, window.__tbcApplyConfig, window.__tbcToast);
      });
    }
    var ob = document.querySelector('#tbcConfigOverlay .tbc-overlay-backdrop');
    if (ob) ob.addEventListener('click', close);
    var mbd = document.querySelector('#tbcTileModal .tbc-modal-backdrop');
    if (mbd) mbd.addEventListener('click', closeTileModal);
    var bc = document.getElementById('tbcConfigClose');
    if (bc) bc.addEventListener('click', close);
    var bs = document.getElementById('tbcConfigSave');
    if (bs) bs.addEventListener('click', save);
    var ap = document.getElementById('tbcAddPage');
    if (ap) {
      ap.addEventListener('click', function () {
        readPageFields();
        var id = 'page_' + Date.now();
        draft.pages.push({
          id: id,
          title: 'New page',
          subtitle: '',
          tiles: []
        });
        pageIdx = draft.pages.length - 1;
        renderPageList();
        renderPageFields();
        refreshTileListAndLauncherGrid();
      });
    }
    var at = document.getElementById('tbcAddTile');
    if (at) {
      at.addEventListener('click', function () {
        readPageFields();
        var p = draft.pages[pageIdx];
        if (!p.tiles) p.tiles = [];
        p.tiles.push({
          id: 'tile_' + Date.now(),
          label: 'New tile',
          icon: '📌',
          kind: 'open',
          target: ''
        });
        refreshTileListAndLauncherGrid();
        openTileModal(pageIdx, p.tiles.length - 1);
      });
    }
    var am = document.getElementById('tbcAddMacro');
    if (am) am.addEventListener('click', function () {
      addMacroRow('', '');
    });
    var kindIn = document.getElementById('tbcTileKindIn');
    if (kindIn) kindIn.addEventListener('change', syncKindFields);
    var tmSave = document.getElementById('tbcTileModalSave');
    if (tmSave) tmSave.addEventListener('click', saveTileModal);
    var tmCancel = document.getElementById('tbcTileModalCancel');
    if (tmCancel) tmCancel.addEventListener('click', closeTileModal);

    var lgChk = document.getElementById('tbcLgCustomEnabled');
    if (lgChk) {
      lgChk.addEventListener('change', function () {
        if (!draft) return;
        if (lgChk.checked) {
          if (!draft.launcherGrid) draft.launcherGrid = defaultLauncherLayout();
        } else {
          delete draft.launcherGrid;
          if (draft.streamdeck) delete draft.streamdeck;
        }
        renderLauncherGridEditor();
      });
    }
    var lgApply = document.getElementById('tbcLgApplyDims');
    if (lgApply) lgApply.addEventListener('click', applyLauncherDimsFromToolbar);
    var lgAuto = document.getElementById('tbcLgAutoFill');
    if (lgAuto) lgAuto.addEventListener('click', fillLauncherGridFromAllTiles);
    var lgClr = document.getElementById('tbcLgClear');
    if (lgClr) lgClr.addEventListener('click', clearLauncherGridCustom);
  }

  window.TbcEditor = { init: init, open: open, close: close };
})();
