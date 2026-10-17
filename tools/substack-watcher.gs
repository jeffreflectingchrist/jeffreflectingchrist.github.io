/**
 * Substack watcher for Jeff Reflecting Christ.
 *
 * Runs in Google Apps Script every 5 minutes. It looks at both Substacks. When a post
 * is new (or one of the newest posts was edited) it asks Cloudflare to rebuild the
 * website, then checks that the post really shows up on the site. If it does not, it
 * asks again, and emails you if it still fails.
 *
 * Chinese Substack  -> https://jeffreflectingchrist.pages.dev/
 * English Substack  -> https://jeffreflectingchrist.pages.dev/en/
 *
 * One-time setup: paste your Cloudflare deploy hook address below, then run `setup`.
 */
var CONFIG = {
  DEPLOY_HOOK: 'PASTE_YOUR_DEPLOY_HOOK_ADDRESS_HERE',
  SITE: 'https://jeffreflectingchrist.pages.dev',
  BLOGS: [
    { lang: 'zh', substack: 'huiyingjidu', prefix: '' },
    { lang: 'en', substack: 'jeffreflectingchrist', prefix: '/en' }
  ],
  WATCH_NEWEST: 3,      // also notice edits to this many of the newest posts
  VERIFY_AFTER_MIN: 6,  // wait this long after a rebuild before checking the site
  RETRY_AFTER_MIN: 12,  // if a new post is still not on the site by now, rebuild again
  MAX_TRIES: 4,         // then email you
  BACKSTOP_HOURS: 24    // rebuild at least this often, in case anything was missed
};

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/html,application/xml;q=0.9,*/*;q=0.8'
};

/* ---------- Run these yourself ---------- */

/** Run once. Starts the 5 minute check and runs it right away. */
function setup() {
  checkHook_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'check') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('check').timeBased().everyMinutes(5).create();
  Logger.log('Done. The watcher will now check every 5 minutes.');
  check();
}

/** Looks at both Substacks and the website, and changes nothing. */
function test() {
  CONFIG.BLOGS.forEach(function (b) {
    var res = listPosts_(b);
    Logger.log(b.lang + ' (' + b.substack + '): ' + (res.ok ? res.posts.length + ' post(s) found' : 'COULD NOT READ SUBSTACK'));
    res.posts.slice(0, 5).forEach(function (p) { Logger.log('   ' + p.slug + '  |  ' + p.title); });
  });
  Logger.log('Saved state: ' + (PropertiesService.getScriptProperties().getProperty('state') || 'none yet'));
}

/** Asks Cloudflare to rebuild the website right now. */
function rebuildNow() {
  checkHook_();
  Logger.log(fireHook_() ? 'Cloudflare was asked to rebuild.' : 'Cloudflare did not accept the request. Check the deploy hook address.');
}

/** Stops the watcher. */
function stop() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  Logger.log('The watcher is stopped.');
}

/* ---------- The 5 minute check ---------- */

function check() {
  checkHook_();
  var props = PropertiesService.getScriptProperties();
  var state = JSON.parse(props.getProperty('state') || '{}');
  var now = Date.now();
  var next = JSON.parse(JSON.stringify(state));
  var changes = [];
  var newSlugs = {};
  var readAll = true;

  CONFIG.BLOGS.forEach(function (b) {
    var res = listPosts_(b);
    if (!res.ok) {
      readAll = false;
      Logger.log(b.substack + ': could not read Substack this time, will try again.');
      return;
    }
    var prev = state[b.lang] || {};
    var known = (prev.slugs || []).slice();
    var hashes = JSON.parse(JSON.stringify(prev.hashes || {}));

    res.posts.forEach(function (p) {
      if (known.indexOf(p.slug) < 0) {
        known.push(p.slug);
        changes.push(b.lang + ': new post "' + p.title + '"');
        (newSlugs[b.lang] = newSlugs[b.lang] || []).push(p.slug);
      }
    });

    var newest = res.posts.slice().sort(function (a, c) { return c.time - a.time; }).slice(0, CONFIG.WATCH_NEWEST);
    newest.forEach(function (p) {
      var h = postHash_(b, p.slug);
      if (h === null) return;
      if (hashes[p.slug] !== undefined && hashes[p.slug] !== h) {
        changes.push(b.lang + ': edited post "' + p.title + '"');
      }
      hashes[p.slug] = h;
    });

    next[b.lang] = { slugs: known, hashes: hashes };
  });

  var pending = state.pending || null;

  if (changes.length > 0) {
    Logger.log('Changes found:\n  ' + changes.join('\n  '));
    if (fireHook_()) {
      next.lastFire = now;
      next.pending = { firedAt: now, tries: 1, expect: newSlugs };
      next.hookFailures = 0;
      Logger.log('Cloudflare was asked to rebuild.');
    } else {
      // Keep the old state, so the same changes are found and tried again in 5 minutes.
      next = state;
      next.hookFailures = (state.hookFailures || 0) + 1;
      Logger.log('Cloudflare did not accept the rebuild request.');
      if (next.hookFailures === 3) {
        alert_('The website could not be told to rebuild',
          'The watcher found new or edited posts, but Cloudflare did not accept the rebuild request three times in a row. ' +
          'The deploy hook address in the script may be wrong or deleted.');
      }
    }
  } else if (pending) {
    var ageMin = (now - pending.firedAt) / 60000;
    if (ageMin >= CONFIG.VERIFY_AFTER_MIN) {
      var missing = missingOnSite_(pending.expect || {});
      if (missing.length === 0) {
        Logger.log('Confirmed: the website shows the new posts.');
        next.pending = null;
      } else if (ageMin >= CONFIG.RETRY_AFTER_MIN) {
        if (pending.tries < CONFIG.MAX_TRIES) {
          Logger.log('Not on the site yet (' + missing.join(', ') + '). Asking Cloudflare again.');
          if (fireHook_()) {
            next.lastFire = now;
            next.pending = { firedAt: now, tries: pending.tries + 1, expect: pending.expect };
          }
        } else {
          alert_('A new post is not showing on the website',
            'The post(s) ' + missing.join(', ') + ' are on Substack but still missing from the website after ' +
            CONFIG.MAX_TRIES + ' rebuild attempts. Check the Cloudflare Pages deployments for a failed build.');
          next.pending = null;
        }
      }
    }
  } else if (readAll && now - (state.lastFire || 0) > CONFIG.BACKSTOP_HOURS * 3600000) {
    Logger.log('Daily safety rebuild.');
    if (fireHook_()) next.lastFire = now;
  }

  props.setProperty('state', JSON.stringify(next));
}

/* ---------- Helpers ---------- */

function checkHook_() {
  if (!CONFIG.DEPLOY_HOOK || CONFIG.DEPLOY_HOOK.indexOf('https://') !== 0) {
    throw new Error('Paste your Cloudflare deploy hook address into DEPLOY_HOOK at the top of the script first.');
  }
}

function fireHook_() {
  try {
    var r = UrlFetchApp.fetch(CONFIG.DEPLOY_HOOK, { method: 'post', muteHttpExceptions: true });
    var c = r.getResponseCode();
    return c >= 200 && c < 300;
  } catch (e) {
    Logger.log('Deploy hook error: ' + e);
    return false;
  }
}

function fetchText_(url, tries) {
  for (var i = 0; i < tries; i++) {
    try {
      var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: HEADERS });
      var c = r.getResponseCode();
      if (c === 200) return r.getContentText();
      if (c === 429 || c >= 500) { Utilities.sleep(2000 * (i + 1)); continue; }
      return null;
    } catch (e) {
      Utilities.sleep(1500);
    }
  }
  return null;
}

/** The posts on one Substack. Tries the archive list, then the feed. */
function listPosts_(blog) {
  var base = 'https://' + blog.substack + '.substack.com';
  var posts = [];
  var ok = false;

  var json = fetchText_(base + '/api/v1/archive?sort=new&limit=20&offset=0', 3);
  if (json !== null) {
    try {
      var arr = JSON.parse(json);
      if (Array.isArray(arr)) {
        ok = true;
        arr.forEach(function (p) {
          if (p.slug) posts.push({ slug: p.slug, title: p.title || p.slug, time: new Date(p.post_date).getTime() || 0 });
        });
      }
    } catch (e) { /* try the feed */ }
  }

  // Substack's own lists sometimes lag, so also read the feed and combine both.
  var xml = fetchText_(base + '/feed', 2);
  if (xml !== null) {
    ok = true;
    (xml.match(/<item>[\s\S]*?<\/item>/g) || []).forEach(function (item) {
      var link = (item.match(/<link>([^<]+)<\/link>/) || [])[1] || '';
      var slug = (link.split('/p/')[1] || '').split(/[?#]/)[0];
      if (!slug || posts.some(function (p) { return p.slug === slug; })) return;
      var title = ((item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || slug).trim();
      var date = (item.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1];
      posts.push({ slug: slug, title: title, time: date ? new Date(date).getTime() : 0 });
    });
  }
  return { ok: ok, posts: posts };
}

/** A fingerprint of one post's title and text, so edits are noticed. */
function postHash_(blog, slug) {
  var json = fetchText_('https://' + blog.substack + '.substack.com/api/v1/posts/' + slug, 2);
  if (json === null) return null;
  try {
    var p = JSON.parse(json);
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,
      (p.title || '') + '|' + (p.subtitle || '') + '|' + (p.body_html || ''), Utilities.Charset.UTF_8);
    return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  } catch (e) {
    return null;
  }
}

/** The new posts that the website does not list yet. */
function missingOnSite_(expect) {
  var missing = [];
  CONFIG.BLOGS.forEach(function (b) {
    var slugs = expect[b.lang] || [];
    if (slugs.length === 0) return;
    var html = fetchText_(CONFIG.SITE + b.prefix + '/?v=' + Date.now(), 2) || '';
    slugs.forEach(function (s) {
      if (html.indexOf('/posts/' + s) < 0 && html.indexOf('/posts/' + encodeURIComponent(s)) < 0) {
        missing.push(b.lang + '/' + s);
      }
    });
  });
  return missing;
}

function alert_(subject, body) {
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Jeff Reflecting Christ: ' + subject, body);
  } catch (e) {
    Logger.log('Could not send the email: ' + e);
  }
}
