/* Who's going: fills each event card's empty [data-going] slot with the people who chose to be
   listed when they registered ("Sarah M., John D."), from /api/attendees, so members can share
   rides. textContent only. If the request fails, or nobody is listed, the slot stays hidden. */
(function () {
  var slots = document.querySelectorAll('[data-going]');
  if (!slots.length || !window.fetch) return;
  fetch('/api/attendees', { cache: 'no-store', credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var events = data && data.events;
      if (!events) return;
      for (var i = 0; i < slots.length; i++) {
        var id = slots[i].getAttribute('data-going');
        var names = Object.prototype.hasOwnProperty.call(events, id) ? events[id] : null;
        if (!Array.isArray(names) || !names.length) continue;
        slots[i].textContent = 'Going: ' + names.filter(function (n) { return typeof n === 'string'; }).join(', ');
        slots[i].hidden = false;
      }
    })
    .catch(function () { /* stays hidden */ });
})();
