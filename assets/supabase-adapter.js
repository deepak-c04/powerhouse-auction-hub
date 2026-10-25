(function () {
  "use strict";
  var URL = "https://ebgxtpcduwudabvnvrec.supabase.co";
  var KEY = "sb_publishable_nwB7Ml4ASwWLzFKjr0lq-g_CPVewZsW";
  if (!window.supabase || !window.supabase.createClient) return;
  var client = window.supabase.createClient(URL, KEY, { auth: { persistSession: false } });

  function snapshot(row) {
    return { exists: !!row, data: function () { return row ? row.data : null; }, id: row ? row.path.split("/").pop() : "" };
  }
  function read(path) {
    return client.from("ph_documents").select("path,data").eq("path", path).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      return snapshot(r.data);
    });
  }
  function write(path, data, merge) {
    var p = merge ? read(path).then(function (s) { return Object.assign({}, s.data() || {}, data); }) : Promise.resolve(data);
    return p.then(function (value) { return client.from("ph_documents").upsert({ path: path, data: value, updated_at: new Date().toISOString() }, { onConflict: "path" }); }).then(function (r) { if (r.error) throw r.error; });
  }
  function remove(path) { return client.from("ph_documents").delete().eq("path", path).then(function (r) { if (r.error) throw r.error; }); }
  function doc(path) {
    return { get: function () { return read(path); }, set: function (d) { return write(path, d, false); }, update: function (d) { return write(path, d, true); }, delete: function () { return remove(path); } };
  }
  function query(prefix, filters, max) {
    var q = client.from("ph_documents").select("path,data").like("path", prefix + "/%");
    return q.then(function (r) {
      if (r.error) throw r.error;
      var rows = (r.data || []).filter(function (row) {
        return (!filters || !filters.length) || filters.every(function (f) { return row.data && row.data[f[0]] === f[2]; });
      });
      if (max) rows = rows.slice(0, max);
      return { docs: rows.map(snapshot), size: rows.length };
    });
  }
  function collection(prefix) {
    var filters = [], max = 0;
    var api = {
      where: function (field, op, value) { if (op !== "==") throw new Error("Only equality filters are supported"); filters.push([field, op, value]); return api; },
      limit: function (n) { max = n; return api; },
      onSnapshot: function (next, fail) {
        var active = true, channel = client.channel("ph-" + Math.random().toString(36).slice(2));
        function refresh() { query(prefix, filters, max).then(function (x) { if (active) next(x); }).catch(function (e) { if (fail) fail(e); }); }
        refresh();
        channel.on("postgres_changes", { event: "*", schema: "public", table: "ph_documents" }, refresh).subscribe();
        return function () { active = false; client.removeChannel(channel); };
      }
    };
    return api;
  }
  window.phSupabaseDb = { doc: doc, collection: collection };
  window.phSupabaseUser = { id: function () { var k = "ph-auction-user"; var v = localStorage.getItem(k); if (!v) { v = "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); } return Promise.resolve(v); }, can: function () { return Promise.resolve(true); } };
}());
