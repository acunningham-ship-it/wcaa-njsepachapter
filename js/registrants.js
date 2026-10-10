/* "List of registrants" — the button that sits next to "Register for this event" on an event
 * card. It opens a small dialog that shows who is registered (first name + last initial) and the
 * event's meeting (Zoom) link, from /api/registrants.
 *
 * Same shape as js/going.js and js/forms.js: a plain deferred script, no imports, no framework.
 * It loads ONLY on a page that actually has an event you can register for (js/blocks.js gates the
 * script tag on a [data-registrants] button being present), so the six content pages ship nothing.
 *
 * ⛔ WHAT THE SERVER GUARANTEES, AND WHY THIS FILE STILL TREATS EVERYTHING AS TEXT.
 *   - The names and the meeting link come from /api/registrants, i.e. ultimately from a database,
 *     so they are written with textContent / assigned to .href, NEVER innerHTML. Escape-at-use is
 *     the project rule (see js/forms.js) and this is a use.
 *   - No registrant email is ever in the response the server sends here (functions/api/registrants.js
 *     selects names only), so there is nothing to leak even by mistake — but this file never asks
 *     for one either.
 *   - In "gated" mode the server will not return the names or the link until the viewer proves, with
 *     the email they registered with, that they are on the list. This file just carries that email
 *     to the server; it decides nothing about who may see what.
 */
(function () {
  'use strict';

  var buttons = document.querySelectorAll('[data-registrants]');
  if (!buttons.length || !window.fetch) return;

  var ENDPOINT = '/api/registrants';
  var lastFocus = null;   // the button that opened the dialog, so focus can return to it on close

  /* ---------- the dialog, built once and reused ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'wcaa-rl';
  overlay.hidden = true;

  var box = document.createElement('div');
  box.className = 'wcaa-rl__box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'wcaa-rl-title');
  box.tabIndex = -1;

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'wcaa-rl__close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';   // ×

  var title = document.createElement('h2');
  title.className = 'wcaa-rl__title';
  title.id = 'wcaa-rl-title';
  title.textContent = 'Registrants';

  var bodyEl = document.createElement('div');
  bodyEl.className = 'wcaa-rl__body';

  box.appendChild(closeBtn);
  box.appendChild(title);
  box.appendChild(bodyEl);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* A one-line status message (loading / error), textContent only. */
  function message(text, kind) {
    clear(bodyEl);
    var p = document.createElement('p');
    p.className = 'wcaa-rl__msg' + (kind ? ' wcaa-rl__msg--' + kind : '');
    p.textContent = text;
    bodyEl.appendChild(p);
  }

  function openDialog(trigger, eventTitle) {
    lastFocus = trigger || null;
    title.textContent = eventTitle ? ('Registered: ' + eventTitle) : 'Registrants';
    overlay.hidden = false;
    document.addEventListener('keydown', onKeydown);
    box.focus();
  }

  function closeDialog() {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    clear(bodyEl);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function onKeydown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) closeDialog();
  }

  closeBtn.addEventListener('click', closeDialog);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeDialog();   // click the backdrop, not the card
  });

  /* ---------- rendering the result ---------- */

  /* Shows the roster + meeting link. `data` is { names: [...], meeting: <https url | null> }.
     Names are rendered with textContent; the link's href is assigned, not interpolated, and only
     if it is an https URL — the same client-side guard js/forms.js uses on the confirmation link. */
  function renderList(data) {
    clear(bodyEl);
    var names = (data && Array.isArray(data.names)) ? data.names.filter(function (n) { return typeof n === 'string' && n; }) : [];

    // Meeting link first — it is the thing most people open the dialog for.
    var meeting = data && data.meeting;
    if (typeof meeting === 'string' && /^https:\/\//i.test(meeting)) {
      var linkWrap = document.createElement('p');
      linkWrap.className = 'wcaa-rl__link';
      var a = document.createElement('a');
      a.className = 'wcaa-btn wcaa-btn--primary wcaa-btn--md';
      a.href = meeting;                       // assigned, never built into HTML
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = 'Join the meeting';
      linkWrap.appendChild(a);
      bodyEl.appendChild(linkWrap);

      var url = document.createElement('p');
      url.className = 'wcaa-rl__url';
      url.textContent = meeting;              // so it can be copied; textContent, not a link body
      bodyEl.appendChild(url);
    } else {
      var none = document.createElement('p');
      none.className = 'wcaa-rl__msg';
      none.textContent = 'The meeting link hasn’t been posted yet.';
      bodyEl.appendChild(none);
    }

    var heading = document.createElement('p');
    heading.className = 'wcaa-rl__count';
    heading.textContent = names.length
      ? (names.length === 1 ? '1 person registered' : names.length + ' people registered')
      : 'No one has registered yet.';
    bodyEl.appendChild(heading);

    if (names.length) {
      var ul = document.createElement('ul');
      ul.className = 'wcaa-rl__names';
      for (var i = 0; i < names.length; i++) {
        var li = document.createElement('li');
        li.textContent = names[i];            // first name + last initial, from the server
        ul.appendChild(li);
      }
      bodyEl.appendChild(ul);
    }
  }

  /* The gated-mode form: ask for the email the person registered with, POST it, render on success
     or show the server's message on failure. No email is ever shown back; this only sends one. */
  function renderGate(eventId) {
    clear(bodyEl);
    var intro = document.createElement('p');
    intro.className = 'wcaa-rl__msg';
    intro.textContent = 'Enter the email you registered with to see who’s registered and the meeting link.';
    bodyEl.appendChild(intro);

    var field = document.createElement('div');
    field.className = 'wcaa-field';
    var label = document.createElement('label');
    label.className = 'wcaa-field__label';
    label.setAttribute('for', 'wcaa-rl-email');
    label.textContent = 'Email';
    var input = document.createElement('input');
    input.className = 'wcaa-field__input';
    input.id = 'wcaa-rl-email';
    input.type = 'email';
    input.autocomplete = 'email';
    input.inputMode = 'email';
    input.placeholder = 'you@business.com';
    field.appendChild(label);
    field.appendChild(input);
    bodyEl.appendChild(field);

    var submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'wcaa-btn wcaa-btn--primary wcaa-btn--md wcaa-rl__submit';
    submit.textContent = 'Show the list';
    bodyEl.appendChild(submit);

    var err = document.createElement('p');
    err.className = 'wcaa-rl__msg wcaa-rl__msg--bad';
    err.hidden = true;
    bodyEl.appendChild(err);

    function send() {
      var email = (input.value || '').trim();
      if (!email) { err.textContent = 'Please enter your email.'; err.hidden = false; return; }
      submit.disabled = true;
      var original = submit.textContent;
      submit.textContent = 'Checking…';
      post(eventId, email)
        .then(function (r) {
          if (!r.ok || !r.body || r.body.ok !== true) {
            throw new Error((r.body && r.body.error) || 'We couldn’t show the list. Please try again.');
          }
          renderList(r.body);
        })
        .catch(function (e2) {
          err.textContent = e2.message || 'We couldn’t show the list. Please try again.';
          err.hidden = false;
          submit.disabled = false;
          submit.textContent = original;
        });
    }

    submit.addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    input.focus();
  }

  /* ---------- the two requests ---------- */

  function get(eventId) {
    return fetch(ENDPOINT + '?event_id=' + encodeURIComponent(eventId), { cache: 'no-store', credentials: 'omit' })
      .then(readJson);
  }
  function post(eventId, email) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ event_id: eventId, email: email }),
    }).then(readJson);
  }
  function readJson(res) {
    return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
  }

  /* ---------- wiring the buttons ---------- */

  function onOpen(trigger) {
    var eventId = trigger.getAttribute('data-registrants');
    var eventTitle = trigger.getAttribute('data-event-title') || '';
    if (!eventId) return;
    openDialog(trigger, eventTitle);
    message('Loading…');
    get(eventId)
      .then(function (r) {
        if (!r.ok || !r.body || r.body.ok !== true) {
          throw new Error((r.body && r.body.error) || 'We couldn’t load the list. Please try again.');
        }
        if (r.body.mode === 'public') { renderList(r.body); return; }
        renderGate(eventId);   // "gated" (the default): ask for the email first
      })
      .catch(function (e) {
        message(e.message || 'We couldn’t load the list. Please try again.', 'bad');
      });
  }

  for (var i = 0; i < buttons.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () { onOpen(btn); });
    })(buttons[i]);
  }
})();
