/* Submit handling for the two public forms (contact, RSVP).
 *
 * This is the ONLY JavaScript the site serves, and it exists because Turnstile
 * already forced the issue: the widget needs a script, so there is no JS-free
 * path for a bot-gated form no matter how the form is built. Given that, doing
 * the submit in JS as well buys a result message in place instead of a page of
 * raw JSON, at no additional cost to anyone.
 *
 * Deliberately a plain deferred script, not a module: nothing here needs imports,
 * and a classic script has no CORS or MIME subtleties to go wrong on a static
 * host. One delegated listener handles however many forms are on the page.
 *
 * ⛔ It writes messages with textContent, never innerHTML. The strings come from
 * the API, which means ultimately from a database, and the escaping rule on this
 * project is escape-at-use — this is the use. */
(function () {
  'use strict';

  function setMessage(form, text, kind) {
    var box = form.querySelector('.wcaa-form__msg');
    if (!box) return;
    box.textContent = text;                       // never innerHTML
    box.className = 'wcaa-form__msg wcaa-form__msg--' + kind;
    box.hidden = false;
  }

  /* Show a panel, optionally setting its text first (textContent, never innerHTML). Empty text
     keeps it hidden, so a blank line never takes up room on screen. */
  function show(id, text) {
    var node = document.getElementById(id);
    if (!node) return;
    if (text !== undefined) node.textContent = text;
    node.hidden = text !== undefined && !text;
  }
  function hide(id) {
    var node = document.getElementById(id);
    if (node) node.hidden = true;
  }

  /* register.html: the event comes from the address (?event=<id>) and its details from the JSON
     the page carries. An id that isn't there leaves the "Choose an event first" panel up and the
     form hidden — there is nothing to register for. */
  var regEvent = null;
  var regData = document.getElementById('reg-events');
  if (regData && document.getElementById('reg-form')) {
    var all = {};
    try { all = JSON.parse(regData.textContent) || {}; } catch (e) { all = {}; }
    var wanted = new URLSearchParams(location.search).get('event') || '';
    regEvent = Object.prototype.hasOwnProperty.call(all, wanted) ? all[wanted] : null;
    if (regEvent) {
      document.getElementById('reg-id').value = wanted;
      show('reg-title', regEvent.title);
      show('reg-when', [regEvent.when, regEvent.where].filter(Boolean).join(' · '));
      hide('reg-missing');
      document.getElementById('reg-form').hidden = false;
    }
  }

  /* After a registration: one screen that says it worked, and the meeting button when the event
     has a link. The link is also printed as text, because the person has to get back to it on
     the day and this page is the only place it appears. */
  function registered(form, body) {
    form.hidden = true;
    show('reg-done-title', regEvent ? regEvent.title : 'this event');
    show('reg-done-when', regEvent ? [regEvent.when, regEvent.where].filter(Boolean).join(' · ') : '');
    var join = document.getElementById('reg-join');
    if (join && typeof body.meeting === 'string' && /^https:\/\//i.test(body.meeting)) {
      join.href = body.meeting;
      join.hidden = false;
      show('reg-join-url', body.meeting);
      show('reg-join-note');
    }
    var done = document.getElementById('reg-done');
    done.hidden = false;
    window.scrollTo(0, 0);
    done.focus();
  }

  function collect(form) {
    var data = {};
    var entries = new FormData(form).entries();
    for (var step = entries.next(); !step.done; step = entries.next()) {
      if (typeof step.value[1] === 'string') data[step.value[0]] = step.value[1];
    }
    return data;
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.matches || !form.matches('form[data-endpoint]')) return;
    event.preventDefault();

    var button = form.querySelector('button[type="submit"]');
    var original = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }

    fetch(form.getAttribute('data-endpoint'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(collect(form)),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (r) {
        if (!r.ok || !r.body.ok) {
          throw new Error(r.body.error || 'Something went wrong. Please try again.');
        }
        if (form.hasAttribute('data-register')) { registered(form, r.body); return; }
        setMessage(form, form.getAttribute('data-success') || 'Thank you — we’ve received that.', 'ok');
        form.reset();
        /* Turnstile tokens are single-use. Without this reset a second submit
           sends a spent token and fails verification, which reads to the person
           as "the form broke after it worked once". */
        if (window.turnstile && typeof window.turnstile.reset === 'function') window.turnstile.reset();
      })
      .catch(function (err) {
        setMessage(form, err.message || 'Something went wrong. Please try again.', 'bad');
        if (window.turnstile && typeof window.turnstile.reset === 'function') window.turnstile.reset();
      })
      .then(function () {
        if (button) { button.disabled = false; button.textContent = original; }
      });
  });
})();
