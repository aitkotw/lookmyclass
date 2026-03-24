/* =========================================================
   LookMyClass API Documentation — script.js
   Self-contained, no external dependencies.
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */
  let apiData = null;
  let activeEndpointId = null;
  let searchQuery = '';

  /* -------------------------------------------------------
     DOM refs
  ------------------------------------------------------- */
  const searchInput      = document.getElementById('searchInput');
  const sidebarNav       = document.getElementById('sidebarNav');
  const endpointSections = document.getElementById('endpointSections');
  const welcomeSection   = document.getElementById('welcomeSection');
  const welcomeStats     = document.getElementById('welcomeStats');
  const searchResults    = document.getElementById('searchResults');
  const hamburgerBtn     = document.getElementById('hamburgerBtn');
  const sidebar          = document.getElementById('sidebar');
  const sidebarOverlay   = document.getElementById('sidebarOverlay');
  const logoLink         = document.getElementById('logoLink');

  /* -------------------------------------------------------
     Init
  ------------------------------------------------------- */
  async function init() {
    try {
      const res = await fetch('data/api.json');
      if (!res.ok) throw new Error('Failed to load api.json: ' + res.status);
      apiData = await res.json();
      buildUI();
      handleInitialHash();
    } catch (err) {
      sidebarNav.innerHTML = `<div class="nav-loading" style="color:#ef4444;">
        Error loading API data.<br><small>${err.message}</small>
      </div>`;
      console.error(err);
    }
  }

  /* -------------------------------------------------------
     Build UI
  ------------------------------------------------------- */
  function buildUI() {
    buildWelcomeStats();
    buildSidebar();
    buildEndpointSections();
    bindEvents();
  }

  /* -------------------------------------------------------
     Welcome Stats
  ------------------------------------------------------- */
  function buildWelcomeStats() {
    if (!welcomeStats || !apiData) return;

    let totalEndpoints = 0;
    const methodCounts = {};

    apiData.groups.forEach(group => {
      group.endpoints.forEach(ep => {
        totalEndpoints++;
        methodCounts[ep.method] = (methodCounts[ep.method] || 0) + 1;
      });
    });

    const statsHTML = [
      { value: totalEndpoints, label: 'Endpoints' },
      { value: apiData.groups.length, label: 'Groups' },
      ...Object.entries(methodCounts).map(([m, c]) => ({ value: c, label: m }))
    ].map(s => `
      <div class="stat-card">
        <div class="stat-card-value">${s.value}</div>
        <div class="stat-card-label">${escHtml(s.label)}</div>
      </div>
    `).join('');

    welcomeStats.innerHTML = statsHTML;
  }

  /* -------------------------------------------------------
     Sidebar
  ------------------------------------------------------- */
  function buildSidebar() {
    if (!sidebarNav || !apiData) return;

    const fragments = apiData.groups.map(group => {
      const subgroupMap = {};
      const noSubgroup  = [];

      group.endpoints.forEach(ep => {
        if (ep.subgroup) {
          if (!subgroupMap[ep.subgroup]) subgroupMap[ep.subgroup] = [];
          subgroupMap[ep.subgroup].push(ep);
        } else {
          noSubgroup.push(ep);
        }
      });

      let endpointsHTML = '';

      // No-subgroup endpoints first
      noSubgroup.forEach(ep => {
        endpointsHTML += renderNavItem(ep);
      });

      // Subgroups
      Object.entries(subgroupMap).forEach(([sg, eps]) => {
        endpointsHTML += `<div class="nav-subgroup-label">${escHtml(sg)}</div>`;
        eps.forEach(ep => {
          endpointsHTML += renderNavItem(ep);
        });
      });

      const groupId = 'nav-group-' + group.id;
      const endpointsId = 'nav-endpoints-' + group.id;

      return `
        <div class="nav-group" data-group-id="${escAttr(group.id)}">
          <div class="nav-group-header" id="${groupId}" data-endpoints-id="${endpointsId}">
            <div class="nav-group-title">
              <span class="nav-group-dot" style="background:${escAttr(group.color)};"></span>
              ${escHtml(group.name)}
            </div>
            <span class="nav-group-chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          <div class="nav-group-endpoints" id="${endpointsId}">
            ${endpointsHTML}
          </div>
        </div>
      `;
    });

    sidebarNav.innerHTML = fragments.join('');

    // Set initial max-heights
    sidebarNav.querySelectorAll('.nav-group-endpoints').forEach(el => {
      el.style.maxHeight = el.scrollHeight + 'px';
    });

    // Bind group collapse toggle
    sidebarNav.querySelectorAll('.nav-group-header').forEach(header => {
      header.addEventListener('click', () => toggleNavGroup(header));
    });

    // Bind nav item clicks
    sidebarNav.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.endpointId;
        navigateToEndpoint(id);
      });
    });
  }

  function renderNavItem(ep) {
    const methodClass = 'method-' + ep.method.toLowerCase();
    return `
      <div class="nav-item" data-endpoint-id="${escAttr(ep.id)}" role="button" tabindex="0"
           aria-label="${escAttr(ep.name)}">
        <span class="nav-item-method ${methodClass}">${escHtml(ep.method)}</span>
        <span class="nav-item-name">${escHtml(ep.name)}</span>
      </div>
    `;
  }

  function toggleNavGroup(header) {
    const endpointsId = header.dataset.endpointsId;
    const endpointsEl = document.getElementById(endpointsId);
    const chevron     = header.querySelector('.nav-group-chevron');
    if (!endpointsEl) return;

    const isOpen = !endpointsEl.classList.contains('collapsed');
    if (isOpen) {
      endpointsEl.style.maxHeight = endpointsEl.scrollHeight + 'px';
      // force reflow
      endpointsEl.getBoundingClientRect();
      endpointsEl.style.maxHeight = '0';
      endpointsEl.classList.add('collapsed');
      chevron && chevron.classList.add('rotated');
    } else {
      endpointsEl.classList.remove('collapsed');
      endpointsEl.style.maxHeight = endpointsEl.scrollHeight + 'px';
      chevron && chevron.classList.remove('rotated');
    }
  }

  /* -------------------------------------------------------
     Endpoint Sections
  ------------------------------------------------------- */
  function buildEndpointSections() {
    if (!endpointSections || !apiData) return;

    const html = apiData.groups.map(group => {
      const cardsHTML = group.endpoints.map(ep => renderEndpointCard(ep, group)).join('');
      return `
        <section class="endpoint-group-section" id="group-${escAttr(group.id)}">
          <div class="endpoint-group-header">
            <div class="endpoint-group-color-bar" style="background:${escAttr(group.color)};"></div>
            <h2 class="endpoint-group-name">${escHtml(group.name)}</h2>
            <span class="endpoint-group-count">${group.endpoints.length}</span>
          </div>
          ${cardsHTML}
        </section>
      `;
    }).join('');

    endpointSections.innerHTML = html;

    // Bind card toggles
    endpointSections.querySelectorAll('.endpoint-card-header').forEach(header => {
      header.addEventListener('click', () => toggleCard(header));
    });

    // Bind copy buttons inside code blocks
    bindCopyButtons(endpointSections);

    // Bind code tabs
    endpointSections.querySelectorAll('.code-tab').forEach(tab => {
      tab.addEventListener('click', () => switchCodeTab(tab));
    });

    // Bind response toggles
    endpointSections.querySelectorAll('.response-header').forEach(header => {
      header.addEventListener('click', () => toggleResponse(header));
    });

    // Bind inline copy buttons (base URL etc)
    bindCopyButtons(document);
  }

  function renderEndpointCard(ep, group) {
    const methodClass  = 'method-' + ep.method.toLowerCase();
    const authLabel    = ep.auth ? 'Auth Required' : 'Public';
    const authBadgeClass = ep.auth ? 'required' : 'public';

    // Collapsible card — default closed unless it's the active one
    const cardId   = 'ep-' + ep.id;
    const bodyId   = 'ep-body-' + ep.id;

    return `
      <div class="endpoint-card" id="${cardId}">
        <div class="endpoint-card-header" data-body-id="${bodyId}" data-endpoint-id="${escAttr(ep.id)}">
          <span class="endpoint-card-method method-badge ${methodClass}">${escHtml(ep.method)}</span>
          <span class="endpoint-card-path">${escHtml(ep.path)}</span>
          <span class="endpoint-card-name">${escHtml(ep.name)}</span>
          <div class="endpoint-card-badges">
            <span class="auth-badge ${authBadgeClass}">${authLabel}</span>
          </div>
          <span class="card-chevron" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
        <div class="endpoint-card-body collapsed" id="${bodyId}" style="max-height:0;">
          <div class="endpoint-card-content">
            ${ep.description ? `<p class="endpoint-description">${escHtml(ep.description)}</p>` : ''}
            ${renderPathParams(ep)}
            ${renderQueryParams(ep)}
            ${renderHeaders(ep)}
            ${renderRequestBody(ep)}
            ${renderCodeExamples(ep, group)}
            ${renderResponses(ep)}
          </div>
        </div>
      </div>
    `;
  }

  /* -- Path Params ---------------------------------------- */
  function renderPathParams(ep) {
    if (!ep.pathParams || ep.pathParams.length === 0) return '';
    return `
      <div class="params-section">
        <div class="params-title">Path Parameters</div>
        <table class="params-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>
          </thead>
          <tbody>
            ${ep.pathParams.map(p => `
              <tr>
                <td><span class="param-name">${escHtml(p.name)}</span></td>
                <td><span class="param-type">${escHtml(p.type)}</span></td>
                <td><span class="param-required ${p.required ? 'yes' : 'no'}">${p.required ? 'Yes' : 'No'}</span></td>
                <td><span class="param-desc">${escHtml(p.description || '')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* -- Query Params --------------------------------------- */
  function renderQueryParams(ep) {
    if (!ep.queryParams || ep.queryParams.length === 0) return '';
    return `
      <div class="params-section">
        <div class="params-title">Query Parameters</div>
        <table class="params-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>
          </thead>
          <tbody>
            ${ep.queryParams.map(p => `
              <tr>
                <td><span class="param-name">${escHtml(p.name)}</span></td>
                <td><span class="param-type">${escHtml(p.type)}</span></td>
                <td><span class="param-required ${p.required ? 'yes' : 'no'}">${p.required ? 'Yes' : 'No'}</span></td>
                <td><span class="param-desc">${escHtml(p.description || '')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* -- Headers ------------------------------------------- */
  function renderHeaders(ep) {
    if (!ep.headers || ep.headers.length === 0) return '';
    return `
      <div class="headers-section params-section">
        <div class="params-title">Headers</div>
        <table class="params-table">
          <thead><tr><th>Key</th><th>Value</th><th>Description</th></tr></thead>
          <tbody>
            ${ep.headers.map(h => `
              <tr>
                <td><span class="param-name">${escHtml(h.key)}</span></td>
                <td><span class="param-type">${escHtml(h.value)}</span></td>
                <td><span class="param-desc">${escHtml(h.description || '')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* -- Request Body --------------------------------------- */
  function renderRequestBody(ep) {
    if (!ep.requestBody) return '';
    const rb = ep.requestBody;

    if (rb.type === 'formdata') {
      const fields = rb.fields || [];
      return `
        <div class="request-body-section">
          <div class="section-header">
            <div class="section-title">Request Body</div>
            <span class="section-badge">multipart/form-data</span>
          </div>
          <div class="formdata-fields">
            ${fields.map(f => `
              <div class="formdata-field">
                <span class="formdata-field-name">${escHtml(f.name)}</span>
                <span class="formdata-field-type">${escHtml(f.type)}</span>
                <span class="param-required ${f.required ? 'yes' : 'no'}">${f.required ? 'required' : 'optional'}</span>
                <span class="formdata-field-desc">${escHtml(f.description || '')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // JSON body
    const json = rb.example ? syntaxHighlightJSON(JSON.stringify(rb.example, null, 2)) : '';
    const raw  = rb.example ? JSON.stringify(rb.example, null, 2) : '';
    return `
      <div class="request-body-section">
        <div class="section-header">
          <div class="section-title">Request Body</div>
          <span class="section-badge">application/json</span>
        </div>
        <div class="code-block-wrapper">
          <div class="code-block">
            <pre>${json}</pre>
          </div>
          <button class="copy-btn" data-copy="${escAttr(raw)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
            </svg>
            Copy
          </button>
        </div>
      </div>
    `;
  }

  /* -- Code Examples (curl / fetch) ---------------------- */
  function renderCodeExamples(ep, group) {
    const curl  = generateCurl(ep);
    const fetchCode = generateFetch(ep);
    const curlId  = 'curl-'  + ep.id;
    const fetchId = 'fetch-' + ep.id;
    const tabsId  = 'tabs-'  + ep.id;

    return `
      <div class="code-examples-section">
        <div class="section-title" style="margin-bottom:0.5rem;">Code Examples</div>
        <div class="code-tabs" id="${tabsId}">
          <div class="code-tab active" data-panel="${curlId}" data-tabs="${tabsId}">cURL</div>
          <div class="code-tab" data-panel="${fetchId}" data-tabs="${tabsId}">JavaScript</div>
        </div>
        <div class="code-panel active" id="${curlId}">
          <div class="code-block-wrapper">
            <div class="code-block">
              <pre>${syntaxHighlightCurl(curl)}</pre>
            </div>
            <button class="copy-btn" data-copy="${escAttr(curl)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
              Copy
            </button>
          </div>
        </div>
        <div class="code-panel" id="${fetchId}">
          <div class="code-block-wrapper">
            <div class="code-block">
              <pre>${syntaxHighlightJS(fetchCode)}</pre>
            </div>
            <button class="copy-btn" data-copy="${escAttr(fetchCode)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
              Copy
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* -- Responses ----------------------------------------- */
  function renderResponses(ep) {
    if (!ep.responses || ep.responses.length === 0) return '';

    const items = ep.responses.map((r, idx) => {
      const statusClass = getStatusClass(r.status);
      const bodyId = 'resp-body-' + ep.id + '-' + idx;
      const json = r.example ? syntaxHighlightJSON(JSON.stringify(r.example, null, 2)) : '';
      const raw  = r.example ? JSON.stringify(r.example, null, 2) : '';

      return `
        <div class="response-item">
          <div class="response-header" data-body-id="${bodyId}">
            <span class="status-badge ${statusClass}">${r.status}</span>
            <span class="response-desc">${escHtml(r.description || '')}</span>
            <span class="response-chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          <div class="response-body collapsed" id="${bodyId}" style="max-height:0;">
            <div class="code-block-wrapper">
              <div class="code-block">
                <pre>${json}</pre>
              </div>
              <button class="copy-btn" data-copy="${escAttr(raw)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
                </svg>
                Copy
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="responses-section">
        <div class="section-title" style="margin-bottom:0.625rem;">Responses</div>
        ${items}
      </div>
    `;
  }

  /* -------------------------------------------------------
     Code Generators
  ------------------------------------------------------- */
  function generateCurl(ep) {
    const baseUrl = apiData.info.baseUrl;
    const url = baseUrl + ep.path;
    const lines = ['curl -X ' + ep.method + ' \\'];
    lines.push('  "' + url + '" \\');
    lines.push('  -H "Content-Type: application/json" \\');

    if (ep.auth) {
      lines.push('  -H "Authorization: Bearer <your_access_token>" \\');
    }

    if (ep.headers) {
      ep.headers.forEach(h => {
        lines.push(`  -H "${h.key}: ${h.value}" \\`);
      });
    }

    if (ep.requestBody) {
      if (ep.requestBody.type === 'formdata') {
        const fields = ep.requestBody.fields || [];
        fields.forEach(f => {
          if (f.type === 'file') {
            lines.push(`  -F "${f.name}=@/path/to/file" \\`);
          } else {
            lines.push(`  -F "${f.name}=value" \\`);
          }
        });
      } else if (ep.requestBody.example) {
        lines.push('  -d \'' + JSON.stringify(ep.requestBody.example) + '\'');
        return lines.join('\n').replace(/ \\$/, '');
      }
    }

    // Remove trailing backslash from last line
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.replace(/ \\$/, '');
    return lines.join('\n');
  }

  function generateFetch(ep) {
    const baseUrl = apiData.info.baseUrl;
    const url = baseUrl + ep.path;
    const lines = [];

    lines.push('const response = await fetch(');
    lines.push(`  "${url}",`);
    lines.push('  {');
    lines.push(`    method: "${ep.method}",`);

    // Headers
    const headers = { 'Content-Type': 'application/json' };
    if (ep.auth) headers['Authorization'] = 'Bearer <your_access_token>';
    if (ep.headers) {
      ep.headers.forEach(h => { headers[h.key] = h.value; });
    }

    lines.push('    headers: ' + JSON.stringify(headers, null, 6).replace(/^/gm, '    ').trimStart() + ',');

    if (ep.requestBody && ep.requestBody.type !== 'formdata' && ep.requestBody.example) {
      lines.push('    body: JSON.stringify(' + JSON.stringify(ep.requestBody.example, null, 6).replace(/^/gm, '    ').trimStart() + '),');
    }

    if (ep.requestBody && ep.requestBody.type === 'formdata') {
      lines.push('    // body: formData  (use FormData object for file uploads)');
    }

    lines.push('  }');
    lines.push(');');
    lines.push('');
    lines.push('const data = await response.json();');
    lines.push('console.log(data);');

    return lines.join('\n');
  }

  /* -------------------------------------------------------
     Syntax Highlighting
  ------------------------------------------------------- */
  function syntaxHighlightJSON(json) {
    if (!json) return '';
    const escaped = escHtml(json);
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      match => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            return `<span class="tok-key">${match}</span>`;
          }
          return `<span class="tok-str">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="tok-bool">${match}</span>`;
        if (/null/.test(match))       return `<span class="tok-null">${match}</span>`;
        return `<span class="tok-num">${match}</span>`;
      }
    );
  }

  function syntaxHighlightCurl(code) {
    if (!code) return '';
    return escHtml(code)
      .replace(/^(curl)/gm, '<span class="tok-cmd">$1</span>')
      .replace(/(-X|-H|-d|-F|--data|--header)/g, '<span class="tok-flag">$1</span>')
      .replace(/(https?:\/\/[^\s"\\]+)/g, '<span class="tok-url">$1</span>');
  }

  function syntaxHighlightJS(code) {
    if (!code) return '';
    return escHtml(code)
      .replace(/\b(const|let|var|await|async|return|function|new|true|false|null|undefined)\b/g,
        '<span class="tok-bool">$1</span>')
      .replace(/(\/\/[^\n]*)/g, '<span class="tok-comment">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="tok-str">$1</span>')
      .replace(/(https?:\/\/[^\s"\\]+)/g, '<span class="tok-url">$1</span>');
  }

  /* -------------------------------------------------------
     Toggle Helpers
  ------------------------------------------------------- */
  function toggleCard(header) {
    const bodyId = header.dataset.bodyId;
    const body   = document.getElementById(bodyId);
    const chevron = header.querySelector('.card-chevron');
    if (!body) return;

    const isOpen = !body.classList.contains('collapsed');
    if (isOpen) {
      body.style.maxHeight = body.scrollHeight + 'px';
      body.getBoundingClientRect();
      body.style.maxHeight = '0';
      body.classList.add('collapsed');
      chevron && chevron.classList.remove('open');
    } else {
      body.classList.remove('collapsed');
      body.style.maxHeight = body.scrollHeight + 'px';
      chevron && chevron.classList.add('open');
      // After transition, allow dynamic content resizing
      setTimeout(() => {
        if (!body.classList.contains('collapsed')) {
          body.style.maxHeight = 'none';
        }
      }, 310);
    }
  }

  function toggleResponse(header) {
    const bodyId = header.dataset.bodyId;
    const body   = document.getElementById(bodyId);
    const chevron = header.querySelector('.response-chevron');
    if (!body) return;

    const isOpen = !body.classList.contains('collapsed');
    if (isOpen) {
      body.style.maxHeight = body.scrollHeight + 'px';
      body.getBoundingClientRect();
      body.style.maxHeight = '0';
      body.classList.add('collapsed');
      chevron && chevron.classList.remove('open');
    } else {
      body.classList.remove('collapsed');
      body.style.maxHeight = body.scrollHeight + 'px';
      chevron && chevron.classList.add('open');
      setTimeout(() => {
        if (!body.classList.contains('collapsed')) {
          body.style.maxHeight = 'none';
        }
      }, 310);
    }
  }

  function switchCodeTab(tab) {
    const tabsId  = tab.dataset.tabs;
    const panelId = tab.dataset.panel;
    const tabsEl  = document.getElementById(tabsId);
    if (!tabsEl) return;

    // Deactivate all tabs in group
    tabsEl.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show correct panel - find siblings
    const card = tab.closest('.endpoint-card-content') || tab.closest('.endpoint-card') ||
                 tab.parentElement.parentElement;

    // Find all panels related to this tab group
    const allPanels = card.querySelectorAll('.code-panel');
    allPanels.forEach(p => {
      if (p.id === panelId) {
        p.classList.add('active');
      } else {
        // Only hide panels that belong to this same tab group
        // We identify by checking if any tab in tabsEl points to this panel
        let belongsToGroup = false;
        tabsEl.querySelectorAll('.code-tab').forEach(t => {
          if (t.dataset.panel === p.id) belongsToGroup = true;
        });
        if (belongsToGroup) p.classList.remove('active');
      }
    });
  }

  /* -------------------------------------------------------
     Navigation
  ------------------------------------------------------- */
  function navigateToEndpoint(id, skipHash) {
    if (!id) {
      showWelcome();
      return;
    }

    // Exit search mode
    if (searchQuery) {
      clearSearch();
    }

    activeEndpointId = id;

    // Update URL hash
    if (!skipHash) {
      history.replaceState(null, '', '#' + id);
    }

    // Update active nav item
    sidebarNav.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.endpointId === id);
    });

    // Ensure the card's group is expanded in sidebar
    const navItem = sidebarNav.querySelector(`.nav-item[data-endpoint-id="${id}"]`);
    if (navItem) {
      const groupEl = navItem.closest('.nav-group');
      if (groupEl) {
        const endpointsEl = groupEl.querySelector('.nav-group-endpoints');
        const header = groupEl.querySelector('.nav-group-header');
        if (endpointsEl && endpointsEl.classList.contains('collapsed')) {
          toggleNavGroup(header);
        }
      }
    }

    // Show main sections, hide welcome
    welcomeSection.style.display = 'none';
    endpointSections.style.display = '';
    searchResults.style.display = 'none';

    // Open the card if closed
    const card = document.getElementById('ep-' + id);
    if (card) {
      const body = document.getElementById('ep-body-' + id);
      const header = card.querySelector('.endpoint-card-header');
      const chevron = header && header.querySelector('.card-chevron');
      if (body && body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = body.scrollHeight + 'px';
        chevron && chevron.classList.add('open');
        setTimeout(() => {
          if (!body.classList.contains('collapsed')) {
            body.style.maxHeight = 'none';
          }
        }, 310);
      }

      // Scroll to card
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Also scroll sidebar nav item into view
        if (navItem) {
          navItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }

    // Close mobile sidebar
    closeMobileSidebar();
  }

  function showWelcome() {
    activeEndpointId = null;
    history.replaceState(null, '', window.location.pathname);
    welcomeSection.style.display = '';
    endpointSections.style.display = '';
    searchResults.style.display = 'none';
    sidebarNav.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileSidebar();
  }

  function handleInitialHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      navigateToEndpoint(hash, true);
    }
  }

  /* -------------------------------------------------------
     Search
  ------------------------------------------------------- */
  function performSearch(query) {
    searchQuery = query.trim().toLowerCase();

    if (!searchQuery) {
      clearSearch();
      return;
    }

    welcomeSection.style.display = 'none';
    endpointSections.style.display = 'none';
    searchResults.style.display = '';

    // Update sidebar: show only matching items
    let totalMatches = 0;
    sidebarNav.querySelectorAll('.nav-item').forEach(item => {
      const epId = item.dataset.endpointId;
      const ep   = findEndpoint(epId);
      if (!ep) return;
      const matches = matchesSearch(ep, searchQuery);
      item.style.display = matches ? '' : 'none';
      if (matches) totalMatches++;
    });

    // Expand all groups during search, show subgroup labels if they have visible items
    sidebarNav.querySelectorAll('.nav-group-endpoints').forEach(el => {
      el.classList.remove('collapsed');
      el.style.maxHeight = 'none';
    });
    sidebarNav.querySelectorAll('.nav-group-chevron').forEach(el => el.classList.remove('rotated'));

    // Build search results panel
    const matches = [];
    if (apiData) {
      apiData.groups.forEach(group => {
        group.endpoints.forEach(ep => {
          if (matchesSearch(ep, searchQuery)) {
            matches.push({ ep, group });
          }
        });
      });
    }

    if (matches.length === 0) {
      searchResults.innerHTML = `
        <div class="search-results-container">
          <div class="search-no-results">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p>No endpoints found for "<strong>${escHtml(query)}</strong>"</p>
          </div>
        </div>
      `;
      return;
    }

    const header = `<div class="search-results-header">
      Showing <strong>${matches.length}</strong> result${matches.length !== 1 ? 's' : ''} for
      "<strong>${escHtml(query)}</strong>"
    </div>`;

    const items = matches.map(({ ep, group }) => {
      const methodClass = 'method-' + ep.method.toLowerCase();
      const highlightedName = highlightMatch(ep.name, searchQuery);
      const highlightedPath = highlightMatch(ep.path, searchQuery);
      return `
        <div class="search-result-item" data-endpoint-id="${escAttr(ep.id)}" role="button" tabindex="0">
          <span class="method-badge ${methodClass}">${escHtml(ep.method)}</span>
          <div class="search-result-info">
            <div class="search-result-name">${highlightedName}</div>
            <div class="search-result-path">${highlightedPath}</div>
          </div>
          <span class="search-result-group" style="background:${escAttr(group.color)};">${escHtml(group.name)}</span>
        </div>
      `;
    }).join('');

    searchResults.innerHTML = `
      <div class="search-results-container">
        ${header}
        ${items}
      </div>
    `;

    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.endpointId;
        clearSearch();
        navigateToEndpoint(id);
      });
    });
  }

  function clearSearch() {
    searchQuery = '';
    searchInput.value = '';
    searchResults.style.display = 'none';
    welcomeSection.style.display = '';
    endpointSections.style.display = '';

    // Restore all nav items
    sidebarNav.querySelectorAll('.nav-item').forEach(item => {
      item.style.display = '';
    });
  }

  function matchesSearch(ep, q) {
    return (
      ep.name.toLowerCase().includes(q) ||
      ep.path.toLowerCase().includes(q) ||
      ep.method.toLowerCase().includes(q) ||
      (ep.description && ep.description.toLowerCase().includes(q))
    );
  }

  function highlightMatch(text, query) {
    if (!query) return escHtml(text);
    const escaped  = escHtml(text);
    const escapedQ = escHtml(query);
    const re = new RegExp('(' + escapedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escaped.replace(re, '<mark class="nav-highlight">$1</mark>');
  }

  function findEndpoint(id) {
    if (!apiData) return null;
    for (const group of apiData.groups) {
      const ep = group.endpoints.find(e => e.id === id);
      if (ep) return ep;
    }
    return null;
  }

  /* -------------------------------------------------------
     Copy to Clipboard
  ------------------------------------------------------- */
  function bindCopyButtons(container) {
    container.querySelectorAll('.copy-btn, .copy-btn-inline').forEach(btn => {
      // Avoid double binding
      if (btn._copyBound) return;
      btn._copyBound = true;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const text = btn.dataset.copy;
        if (!text) return;
        copyToClipboard(text, btn);
      });
    });
  }

  function copyToClipboard(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => flashCopied(btn));
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      flashCopied(btn);
    }
  }

  function flashCopied(btn) {
    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 2000);
  }

  /* -------------------------------------------------------
     Mobile Sidebar
  ------------------------------------------------------- */
  function openMobileSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    hamburgerBtn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    hamburgerBtn.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* -------------------------------------------------------
     Event Bindings
  ------------------------------------------------------- */
  function bindEvents() {
    // Search input
    searchInput.addEventListener('input', e => {
      performSearch(e.target.value);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') clearSearch();
    });

    // Keyboard shortcut Ctrl+K / Cmd+K
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    // Hamburger
    hamburgerBtn && hamburgerBtn.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });

    // Overlay click
    sidebarOverlay && sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Logo -> welcome
    logoLink && logoLink.addEventListener('click', e => {
      e.preventDefault();
      clearSearch();
      showWelcome();
    });

    // Hash change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        navigateToEndpoint(hash, true);
      } else {
        showWelcome();
      }
    });

    // Keyboard navigation on nav items
    sidebarNav.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.nav-item');
        if (item) {
          e.preventDefault();
          navigateToEndpoint(item.dataset.endpointId);
        }
      }
    });
  }

  /* -------------------------------------------------------
     Utility
  ------------------------------------------------------- */
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(str) {
    return escHtml(str).replace(/'/g, '&#39;');
  }

  function getStatusClass(status) {
    const s = parseInt(status, 10);
    if (s >= 200 && s < 300) return 'status-2xx';
    if (s >= 300 && s < 400) return 'status-3xx';
    if (s >= 400 && s < 500) return 'status-4xx';
    if (s >= 500)             return 'status-5xx';
    return 'status-2xx';
  }

  /* -------------------------------------------------------
     Boot
  ------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
