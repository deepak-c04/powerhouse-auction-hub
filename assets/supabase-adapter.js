(function () {
  "use strict";
  var API = "https://ebgxtpcduwudabvnvrec.supabase.co/rest/v1/ph_documents";
  var KEY = "sb_publishable_nwB7Ml4ASwWLzFKjr0lq-g_CPVewZsW";
  var headers = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };

  function jsonText(response) {
    return response.text().then(function (text) {
      var body = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error((body && (body.message || body.error || body.hint)) || ("Supabase request failed (" + response.status + ")"));
      return body;
    });
  }
  function request(url, options) {
    options = options || {};
    options.headers = Object.assign({}, headers, options.headers || {});
    return fetch(url, options).then(jsonText);
  }
  function retry(task, attempts) {
    attempts = attempts || 3;
    return task().catch(function (error) {
      if (attempts <= 1) throw error;
      return new Promise(function (resolve) { setTimeout(resolve, (4 - attempts) * 350); }).then(function () { return retry(task, attempts - 1); });
    });
  }
  function exact(path) { return API + "?select=path,data&path=eq." + encodeURIComponent(path) + "&limit=1"; }
  function snapshot(row) { return { exists: !!row, data: function () { return row ? row.data : null; }, id: row ? row.path.split("/").pop() : "" }; }
  function read(path) { return retry(function () { return request(exact(path)); }).then(function (rows) { return snapshot(rows && rows[0]); }); }
  function write(path, data, merge) {
    var valuePromise = merge ? read(path).then(function (s) { return Object.assign({}, s.data() || {}, data); }) : Promise.resolve(data);
    return valuePromise.then(function (value) {
      return retry(function () { return request(API + "?on_conflict=path", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ path: path, data: value, updated_at: new Date().toISOString() }]) }); });
    });
  }
  function remove(path) { return retry(function () { return request(API + "?path=eq." + encodeURIComponent(path), { method: "DELETE", headers: { Prefer: "return=minimal" } }); }); }
  function acquire(path, opts) {
    opts = opts || {};
    var lockPath = path + "/__lock", now = Date.now(), ttl = opts.ttlMs || 4000;
    return read(lockPath).then(function (s) {
      var old = s.data();
      if (old && old.holder && old.expiresAt > now && old.holder !== opts.holder) return { acquired: false };
      return write(lockPath, { holder: opts.holder, expiresAt: now + ttl }, false).then(function () { return { acquired: true }; });
    });
  }
  function release(path, holder) { return read(path + "/__lock").then(function (s) { var old = s.data(); if (old && old.holder === holder) return remove(path + "/__lock"); }); }
  function watch(path, next, fail) {
    var active = true, last = "";
    function refresh() {
      read(path).then(function (value) {
        if (!active) return;
        var signature = JSON.stringify(value && value.exists ? value.data() : null);
        if (signature !== last) { last = signature; next(value); }
      }).catch(function (error) { if (active && fail) fail(error); });
    }
    refresh();
    var timer = setInterval(refresh, 1500);
    return function () { active = false; clearInterval(timer); };
  }
  function doc(path) {
    return { get: function () { return read(path); }, set: function (data) { return write(path, data, false); }, update: function (data) { return write(path, data, true); }, delete: function () { return remove(path); }, onSnapshot: function (next, fail) { return watch(path, next, fail); }, acquire: function (opts) { return acquire(path, opts); }, release: function (holder) { return release(path, holder); } };
  }
  function query(prefix, filters, max) {
    return request(API + "?select=path,data&path=like." + encodeURIComponent(prefix + "/*") + "&order=path.asc").then(function (rows) {
      var result = (rows || []).filter(function (row) { return (!filters || !filters.length) || filters.every(function (f) { return row.data && row.data[f[0]] === f[2]; }); });
      if (max) result = result.slice(0, max);
      return { docs: result.map(snapshot), size: result.length };
    });
  }
  function collection(prefix) {
    var filters = [], max = 0;
    var api = {
      where: function (field, op, value) { if (op !== "==") throw new Error("Only equality filters are supported"); filters.push([field, op, value]); return api; },
      limit: function (n) { max = n; return api; },
      onSnapshot: function (next, fail) {
        var active = true, last = "";
        function refresh() { query(prefix, filters, max).then(function (value) { if (!active) return; var signature = JSON.stringify(value); if (signature !== last) { last = signature; next(value); } }).catch(function (error) { if (active && fail) fail(error); }); }
        refresh();
        var timer = setInterval(refresh, 1500);
        return function () { active = false; clearInterval(timer); };
      }
    };
    return api;
  }
  window.phSupabaseDb = { doc: doc, collection: collection };
  window.phSupabaseUser = { id: function () { var key = "ph-auction-user", value = localStorage.getItem(key); if (!value) { value = "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(key, value); } return Promise.resolve(value); }, can: function () { return Promise.resolve(true); } };
}());
