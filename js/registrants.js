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
 *
 * COMING BACK (judge #11487, Armani: "once they register, if they go back to events it doesn't show
 * the link, it has them re-register"). A browser that registered (js/forms.js) or opened the list
 * with an email here remembers that email for the event. Its card then says "You're registered" and
 * the button reads "View the meeting link", and the dialog sends the remembered email by itself once
 * the bot check passes: one tap, nothing re-typed, no second registration. The server check is
 * unchanged (Turnstile + "is this email registered", every time); remembering only saves typing. A
 * remembered email the server says isn't registered (an officer removed it) is forgotten.
 */
(function () {
  'use strict';

  var buttons = document.querySelectorAll('[data-registrants]');
  if (!buttons.length || !window.fetch) return;

  var ENDPOINT = '/api/registrants';
  var TURNSTILE_API = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  var lastFocus = null;    // the button that opened the dialog, so focus can return to it on close
  var tsWidgetId = null;   // the Turnstile widget currently rendered in the gated form, if any

  /* Load the Turnstile script on demand — only when a gated view actually needs the challenge, so
     the events page ships none of it until the button is used. Resolves with window.turnstile. */
  var tsLoading = null;
  function loadTurnstile() {
    if (window.turnstile && typeof window.turnstile.render === 'function') return Promise.resolve(window.turnstile);
    if (tsLoading) return tsLoading;
    tsLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = TURNSTILE_API; s.async = true; s.defer = true;
      s.onload = function () { window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile unavailable')); };
      s.onerror = function () { reject(new Error('turnstile failed to load')); };
      document.head.appendChild(s);
    });
    return tsLoading;
  }
  function removeWidget() {
    if (tsWidgetId !== null && window.turnstile && typeof window.turnstile.remove === 'function') {
      try { window.turnstile.remove(tsWidgetId); } catch (e) { /* already gone */ }
    }
    tsWidgetId = null;
  }

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

  /* ---------- what this browser remembers: { email } per event, nothing else ----------
     Storage can be off or throw (private windows, blocked site data): then nothing is remembered
     and everything works the way it did before. */
  var KEY = 'wcaa-registered:';
  function remembered(id) {
    try {
      var v = JSON.parse(localStorage.getItem(KEY + id) || 'null');
      return v && typeof v.email === 'string' ? v.email : '';
    } catch (e) { return ''; }
  }
  function remember(id, email) { try { localStorage.setItem(KEY + id, JSON.stringify({ email: email })); } catch (e) { /* not remembered */ } }
  function forget(id) { try { localStorage.removeItem(KEY + id); } catch (e) { /* nothing to forget */ } }

  /* An event card for someone this browser knows is registered: "You're registered as <email>"
     with a "Not you?" to undo it, the button names what they came back for, and Register steps
     aside (it would only make them register twice). Only cards on the events page: the register
     page has its own "already registered" panel (js/forms.js). */
  function markCard(btn) {
    var actions = btn.parentNode;
    if (!actions || !actions.classList.contains('wcaa-ev__actions')) return;
    var id = btn.getAttribute('data-registrants');
    var email = remembered(id);
    var reg = actions.querySelector('.wcaa-ev__reg');
    var mine = actions.nextElementSibling && actions.nextElementSibling.classList.contains('wcaa-ev__mine') ? actions.nextElementSibling : null;
    if (!btn.hasAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
    if (reg) reg.hidden = !!email;
    btn.textContent = email ? 'View the meeting link' : btn.getAttribute('data-label');
    btn.classList.toggle('wcaa-btn--primary', !!email);   // it's the card's main action now that Register stepped aside
    btn.classList.toggle('wcaa-btn--outline', !email);
    if (!email) { if (mine) mine.parentNode.removeChild(mine); return; }
    if (!mine) {
      mine = document.createElement('p');
      mine.className = 'wcaa-ev__mine';
      actions.parentNode.insertBefore(mine, actions.nextSibling);
    }
    clear(mine);
    mine.appendChild(document.createTextNode('✓ You’re registered as '));
    var who = document.createElement('strong');
    who.textContent = email;                  // their own email, from this browser; textContent
    mine.appendChild(who);
    mine.appendChild(document.createTextNode('. '));
    var notYou = document.createElement('button');
    notYou.type = 'button';
    notYou.className = 'wcaa-ev__notyou';
    notYou.textContent = 'Not you?';
    notYou.addEventListener('click', function () { forget(id); refresh(id); });
    mine.appendChild(notYou);
  }
  function refresh(id) {
    for (var i = 0; i < buttons.length; i++) if (buttons[i].getAttribute('data-registrants') === id) markCard(buttons[i]);
  }

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
    removeWidget();
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

  /* The gated-mode form: ask for the email the person registered with, run the same Turnstile
     bot-check the sign-up form uses, POST both, render on success or show the server's message on
     failure. The email is used only to send; it is never shown back, and the server returns no
     other registrant's address. */
  function renderGate(eventId, tkey, email) {
    clear(bodyEl);
    removeWidget();
    var auto = !!email;   // a remembered email goes by itself, once the bot check has passed

    var intro = document.createElement('p');
    intro.className = 'wcaa-rl__msg';
    intro.textContent = auto
      ? 'Checking your registration…'
      : 'Enter the email you registered with to see who’s registered and the meeting link.';
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
    input.value = email || '';
    field.appendChild(label);
    field.appendChild(input);
    bodyEl.appendChild(field);

    /* The bot check renders into its own slot. Managed Turnstile mostly solves invisibly; an
       interactive challenge appears here if Cloudflare asks for one. */
    var tsSlot = document.createElement('div');
    tsSlot.className = 'wcaa-rl__ts';
    bodyEl.appendChild(tsSlot);

    var submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'wcaa-btn wcaa-btn--primary wcaa-btn--md wcaa-rl__submit';
    submit.textContent = 'Show the list';
    bodyEl.appendChild(submit);

    var err = document.createElement('p');
    err.className = 'wcaa-rl__msg wcaa-rl__msg--bad';
    err.hidden = true;
    bodyEl.appendChild(err);

    if (tkey) {
      loadTurnstile()
        .then(function (ts) {
          if (!tsSlot.isConnected) return;   // the dialog was closed before the script arrived
          tsWidgetId = ts.render(tsSlot, { sitekey: tkey, callback: function () { if (auto) { auto = false; send(); } } });
        })
        .catch(function () { /* can't load: the submit still tries; the server fails closed if it truly can't verify */ });
    } else if (auto) {
      setTimeout(function () { auto = false; send(); }, 0);
    }

    function fail(msg) {
      intro.textContent = 'Enter the email you registered with to see who’s registered and the meeting link.';
      err.textContent = msg; err.hidden = false;
      submit.disabled = false; submit.textContent = 'Show the list';
    }

    function send() {
      var email = (input.value || '').trim();
      if (!email) { fail('Please enter your email.'); return; }
      var token = '';
      if (tkey && window.turnstile && tsWidgetId !== null) {
        try { token = window.turnstile.getResponse(tsWidgetId) || ''; } catch (e) { token = ''; }
        if (!token) { fail('Please complete the verification just above, then try again.'); return; }
      }
      submit.disabled = true; submit.textContent = 'Checking…'; err.hidden = true;
      post(eventId, email, token)
        .then(function (r) {
          if (!r.ok || !r.body || r.body.ok !== true) {
            /* 403 = the server says this email isn't registered: if this browser remembered it, it
               was wrong (an officer removed it), so forget it. Any other failure keeps it. */
            if (r.status === 403 && remembered(eventId) === email) { forget(eventId); refresh(eventId); }
            throw new Error((r.body && r.body.error) || 'We couldn’t show the list. Please try again.');
          }
          remember(eventId, email);   // proven registered: next time it's one tap
          refresh(eventId);
          removeWidget();        // the widget DOM is about to be cleared with the rest of the form
          renderList(r.body);
        })
        .catch(function (e2) {
          // Turnstile tokens are single-use; get a fresh one for the next attempt.
          if (tkey && window.turnstile && tsWidgetId !== null) { try { window.turnstile.reset(tsWidgetId); } catch (e3) {} }
          fail(e2.message || 'We couldn’t show the list. Please try again.');
        });
    }

    submit.addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    if (!auto) input.focus();
  }

  /* ---------- the two requests ---------- */

  function get(eventId) {
    return fetch(ENDPOINT + '?event_id=' + encodeURIComponent(eventId), { cache: 'no-store', credentials: 'omit' })
      .then(readJson);
  }
  function post(eventId, email, token) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ event_id: eventId, email: email, 'cf-turnstile-response': token || '' }),
    }).then(readJson);
  }
  function readJson(res) {
    return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
  }

  /* ---------- wiring the buttons ---------- */

  function onOpen(trigger) {
    var eventId = trigger.getAttribute('data-registrants');
    var eventTitle = trigger.getAttribute('data-event-title') || '';
    var tkey = trigger.getAttribute('data-turnstile-key') || '';
    if (!eventId) return;
    openDialog(trigger, eventTitle);
    message('Loading…');
    get(eventId)
      .then(function (r) {
        if (!r.ok || !r.body || r.body.ok !== true) {
          throw new Error((r.body && r.body.error) || 'We couldn’t load the list. Please try again.');
        }
        if (r.body.mode === 'public') { renderList(r.body); return; }
        renderGate(eventId, tkey, remembered(eventId));   // "gated" (the default): the email + bot-check first
      })
      .catch(function (e) {
        message(e.message || 'We couldn’t load the list. Please try again.', 'bad');
      });
  }

  for (var i = 0; i < buttons.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () { onOpen(btn); });
      markCard(btn);
    })(buttons[i]);
  }
})();
