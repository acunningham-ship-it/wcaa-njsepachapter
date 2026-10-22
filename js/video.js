/* Click-to-play for a pasted video link. The page ships a Play button and a plain "Watch on"
   link; nothing from the video site loads until Play is pressed. The embed address was built
   at render time from an allowlist (render.js videoEmbed) and is re-checked here, so a tampered
   page still cannot point the frame anywhere else. */
(function () {
  var OK = /^https:\/\/(?:www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}|www\.instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/embed\/|www\.facebook\.com\/plugins\/video\.php\?)/;
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-embed]');
    if (!btn) return;
    var src = btn.getAttribute('data-embed');
    if (!OK.test(src)) return;
    var frame = document.createElement('iframe');
    frame.className = 'wcaa-vid__frame';
    frame.src = src;
    frame.title = btn.getAttribute('data-title') || 'Video';
    frame.allowFullscreen = true;
    frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    if (/^\d+ ?\/ ?\d+$/.test(btn.getAttribute('data-ratio') || '')) frame.style.aspectRatio = btn.getAttribute('data-ratio');
    var fig = btn.closest('figure');
    var ph = fig && fig.querySelector('.wcaa-gal__ph');
    if (ph) ph.replaceWith(frame); else btn.before(frame);
    btn.remove();
    frame.focus();
  });
})();
