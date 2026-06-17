/* Minimal 3MF reader for the VoxelForge extension.
   3MF is an OPC (ZIP) package; the mesh lives in 3D/3dmodel.model (XML).
   Service workers have no DOM/zip lib, so this reads the ZIP central directory
   directly and inflates with DecompressionStream. Exposes self.VF3MF.parse(). */
(function (root) {
  "use strict";

  async function inflateRaw(bytes) {
    var ds = new DecompressionStream("deflate-raw");
    var stream = new Response(bytes).body.pipeThrough(ds);
    var ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }

  function findEOCD(buf) {
    var min = Math.max(0, buf.length - 22 - 65535);
    for (var i = buf.length - 22; i >= min; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) return i;
    }
    return -1;
  }

  async function extractModelXml(arrayBuffer) {
    var buf = new Uint8Array(arrayBuffer);
    var dv = new DataView(arrayBuffer);
    var eocd = findEOCD(buf);
    if (eocd < 0) throw new Error("3MF نامعتبر است (EOCD یافت نشد).");
    var cdOffset = dv.getUint32(eocd + 16, true);
    var cdCount = dv.getUint16(eocd + 10, true);
    var dec = new TextDecoder();

    function scan(predicate) {
      var p = cdOffset;
      for (var i = 0; i < cdCount; i++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        var method = dv.getUint16(p + 10, true);
        var compSize = dv.getUint32(p + 20, true);
        var nameLen = dv.getUint16(p + 28, true);
        var extraLen = dv.getUint16(p + 30, true);
        var commLen = dv.getUint16(p + 32, true);
        var localOff = dv.getUint32(p + 42, true);
        var name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
        if (predicate(name)) return { method: method, compSize: compSize, localOff: localOff, name: name };
        p += 46 + nameLen + extraLen + commLen;
      }
      return null;
    }

    var found =
      scan(function (n) { return n.toLowerCase().indexOf("3d/3dmodel.model") !== -1; }) ||
      scan(function (n) { return /\.model$/i.test(n); });
    if (!found) throw new Error("فایل مدل داخل 3MF یافت نشد.");

    var lh = found.localOff;
    if (dv.getUint32(lh, true) !== 0x04034b50) throw new Error("هدر محلی 3MF خراب است.");
    var lnameLen = dv.getUint16(lh + 26, true);
    var lextraLen = dv.getUint16(lh + 28, true);
    var dataStart = lh + 30 + lnameLen + lextraLen;
    var comp = buf.subarray(dataStart, dataStart + found.compSize);
    var raw;
    if (found.method === 0) raw = comp;
    else if (found.method === 8) raw = await inflateRaw(comp);
    else throw new Error("روش فشرده‌سازی 3MF پشتیبانی نمی‌شود.");
    return dec.decode(raw);
  }

  // ---- transforms (3MF: row-vector, 12 numbers) --------------------------
  function parseTransform(str) {
    if (!str) return null;
    var v = str.trim().split(/\s+/).map(Number);
    if (v.length < 12 || v.some(isNaN)) return null;
    // 4x4 row-major; point as row vector p*M
    return [v[0], v[1], v[2], 0, v[3], v[4], v[5], 0, v[6], v[7], v[8], 0, v[9], v[10], v[11], 1];
  }
  function mul(A, B) {
    // p*(A*B) = (p*A)*B
    var R = new Array(16);
    for (var i = 0; i < 4; i++)
      for (var j = 0; j < 4; j++) {
        var s = 0;
        for (var k = 0; k < 4; k++) s += A[i * 4 + k] * B[k * 4 + j];
        R[i * 4 + j] = s;
      }
    return R;
  }
  function applyMat(M, x, y, z) {
    if (!M) return [x, y, z];
    return [
      x * M[0] + y * M[4] + z * M[8] + M[12],
      x * M[1] + y * M[5] + z * M[9] + M[13],
      x * M[2] + y * M[6] + z * M[10] + M[14],
    ];
  }

  function attr(s, name) {
    var m = s.match(new RegExp("\\b" + name + '="([^"]+)"'));
    return m ? m[1] : null;
  }

  function parseModel(xml) {
    var objects = {};
    var objRe = /<object\b([^>]*)>([\s\S]*?)<\/object>/gi, om;
    while ((om = objRe.exec(xml))) {
      var id = attr(om[1], "id");
      if (!id) continue;
      var body = om[2];
      var obj = { verts: [], tris: [], comps: [] };
      var meshM = body.match(/<mesh\b[^>]*>([\s\S]*?)<\/mesh>/i);
      if (meshM) {
        var vSecM = meshM[1].match(/<vertices\b[^>]*>([\s\S]*?)<\/vertices>/i);
        if (vSecM) {
          var vRe = /<vertex\b([^/>]*)\/?>/gi, vm;
          while ((vm = vRe.exec(vSecM[1]))) {
            obj.verts.push(+attr(vm[1], "x"), +attr(vm[1], "y"), +attr(vm[1], "z"));
          }
        }
        var tSecM = meshM[1].match(/<triangles\b[^>]*>([\s\S]*?)<\/triangles>/i);
        if (tSecM) {
          var tRe = /<triangle\b([^/>]*)\/?>/gi, tm;
          while ((tm = tRe.exec(tSecM[1]))) {
            obj.tris.push(+attr(tm[1], "v1"), +attr(tm[1], "v2"), +attr(tm[1], "v3"));
          }
        }
      }
      var compM = body.match(/<components\b[^>]*>([\s\S]*?)<\/components>/i);
      if (compM) {
        var cRe = /<component\b([^/>]*)\/?>/gi, cm;
        while ((cm = cRe.exec(compM[1]))) {
          var oid = attr(cm[1], "objectid");
          if (oid) obj.comps.push({ id: oid, t: parseTransform(attr(cm[1], "transform")) });
        }
      }
      objects[id] = obj;
    }

    var items = [];
    var buildM = xml.match(/<build\b[^>]*>([\s\S]*?)<\/build>/i);
    if (buildM) {
      var iRe = /<item\b([^/>]*)\/?>/gi, im;
      while ((im = iRe.exec(buildM[1]))) {
        var oid2 = attr(im[1], "objectid");
        if (oid2) items.push({ id: oid2, t: parseTransform(attr(im[1], "transform")) });
      }
    }

    var out = [];
    function emit(objId, mat, depth) {
      if (depth > 8) return;
      var obj = objects[objId];
      if (!obj) return;
      for (var i = 0; i < obj.tris.length; i += 3) {
        for (var k = 0; k < 3; k++) {
          var vi = obj.tris[i + k] * 3;
          var p = applyMat(mat, obj.verts[vi], obj.verts[vi + 1], obj.verts[vi + 2]);
          out.push(p[0], p[1], p[2]);
        }
      }
      for (var c = 0; c < obj.comps.length; c++) {
        var comp = obj.comps[c];
        emit(comp.id, comp.t ? (mat ? mul(comp.t, mat) : comp.t) : mat, depth + 1);
      }
    }

    if (items.length) {
      for (var n = 0; n < items.length; n++) emit(items[n].id, items[n].t, 0);
    } else {
      for (var oid3 in objects) emit(oid3, null, 0);
    }
    return new Float32Array(out);
  }

  async function parse(arrayBuffer) {
    var xml = await extractModelXml(arrayBuffer);
    var pos = parseModel(xml);
    if (!pos || pos.length === 0) throw new Error("مش معتبری در 3MF یافت نشد.");
    return pos;
  }

  root.VF3MF = { parse: parse };
})(typeof self !== "undefined" ? self : this);
