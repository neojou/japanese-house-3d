/**
 * Minimal glTF 2.0 binary writer (no extra deps).
 *
 * Legacy: writeGlb(meshes[], extras)
 *   meshes: { name, positions, normals, indices }
 *
 * Scene: writeGlb({ sceneName, materials, meshes, root }, extras)
 *   materials: { name, color:[r,g,b], roughness, metalness, opacity? }
 *   meshes: { name, positions, normals, indices, material? }
 *   root: { name, translation?, rotation? (xyzw), mesh?, extras?, children? }
 */

const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const FLOAT = 5126;
const UINT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY = 34963;

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

function minMax3(pos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const v = pos[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max };
}

function quatFromYaw(yaw) {
  const h = yaw * 0.5;
  return [0, Math.sin(h), 0, Math.cos(h)];
}

function flattenNodes(root) {
  const nodes = [];
  const walk = (n) => {
    const idx = nodes.length;
    const rec = {
      name: n.name,
      children: [],
    };
    if (n.translation) rec.translation = n.translation;
    if (n.rotation) rec.rotation = n.rotation;
    else if (typeof n.rotY === "number" && n.rotY !== 0) {
      rec.rotation = quatFromYaw(n.rotY);
    }
    if (n.mesh != null) rec.mesh = n.mesh;
    if (n.extras) rec.extras = n.extras;
    nodes.push(rec);
    for (const c of n.children ?? []) {
      rec.children.push(walk(c));
    }
    if (rec.children.length === 0) delete rec.children;
    return idx;
  };
  walk(root);
  return nodes;
}

export function writeGlb(meshesOrDoc, extras = {}) {
  const isDoc = meshesOrDoc && !Array.isArray(meshesOrDoc);
  const doc = isDoc
    ? meshesOrDoc
    : {
        sceneName: extras.sceneName || "senmen-basin",
        materials: [],
        meshes: meshesOrDoc,
        root: null,
      };
  const meshes = doc.meshes;
  const materials = doc.materials ?? [];
  const json = {
    asset: {
      version: "2.0",
      generator: extras.generator || "japanese-house-3d/writeGlb",
    },
    extras,
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
  };
  if (materials.length) {
    json.materials = materials.map((m) => {
      const op = m.opacity == null ? 1 : m.opacity;
      const mat = {
        name: m.name,
        pbrMetallicRoughness: {
          baseColorFactor: [m.color[0], m.color[1], m.color[2], op],
          metallicFactor: m.metalness ?? 0,
          roughnessFactor: m.roughness ?? 0.9,
        },
      };
      if (op < 0.999) {
        mat.alphaMode = "BLEND";
        mat.doubleSided = true;
      }
      return mat;
    });
  }
  if (doc.root) {
    json.nodes = flattenNodes(doc.root);
  } else {
    json.nodes = [{ name: doc.sceneName, children: meshes.map((_, i) => i + 1) }];
    for (let i = 0; i < meshes.length; i += 1) {
      json.nodes.push({ name: meshes[i].name, mesh: i });
    }
  }

  const parts = [];
  let offset = 0;

  const addBytes = (u8, target) => {
    const view = {
      buffer: 0,
      byteOffset: offset,
      byteLength: u8.byteLength,
    };
    if (target) view.target = target;
    json.bufferViews.push(view);
    parts.push(u8);
    const pad = pad4(u8.byteLength);
    if (pad) parts.push(new Uint8Array(pad));
    offset += u8.byteLength + pad;
    return json.bufferViews.length - 1;
  };

  for (const m of meshes) {
    const pos = new Uint8Array(m.positions.buffer, m.positions.byteOffset, m.positions.byteLength);
    const nrm = new Uint8Array(m.normals.buffer, m.normals.byteOffset, m.normals.byteLength);
    const idx = new Uint8Array(m.indices.buffer, m.indices.byteOffset, m.indices.byteLength);
    const posView = addBytes(pos, ARRAY_BUFFER);
    const nrmView = addBytes(nrm, ARRAY_BUFFER);
    const idxView = addBytes(idx, ELEMENT_ARRAY);
    const bb = minMax3(m.positions);
    const posAcc = json.accessors.length;
    json.accessors.push({
      bufferView: posView,
      componentType: FLOAT,
      count: m.positions.length / 3,
      type: "VEC3",
      min: bb.min,
      max: bb.max,
    });
    const nrmAcc = json.accessors.length;
    json.accessors.push({
      bufferView: nrmView,
      componentType: FLOAT,
      count: m.normals.length / 3,
      type: "VEC3",
    });
    const idxAcc = json.accessors.length;
    json.accessors.push({
      bufferView: idxView,
      componentType: UINT,
      count: m.indices.length,
      type: "SCALAR",
    });
    const prim = {
      attributes: { POSITION: posAcc, NORMAL: nrmAcc },
      indices: idxAcc,
      mode: 4,
    };
    if (m.material != null && json.materials) prim.material = m.material;
    json.meshes.push({
      name: m.name,
      primitives: [prim],
    });
  }

  json.buffers[0].byteLength = offset;
  const bin = new Uint8Array(offset);
  let o = 0;
  for (const p of parts) {
    bin.set(p, o);
    o += p.byteLength;
  }

  let jsonStr = JSON.stringify(json);
  const jsonPad = pad4(jsonStr.length);
  jsonStr += " ".repeat(jsonPad);
  const jsonBytes = new TextEncoder().encode(jsonStr);

  const binPad = pad4(bin.byteLength);
  const total = 12 + 8 + jsonBytes.length + 8 + bin.byteLength + binPad;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, JSON_CHUNK, true);
  out.set(jsonBytes, 20);
  const binHeader = 20 + jsonBytes.length;
  view.setUint32(binHeader, bin.byteLength + binPad, true);
  view.setUint32(binHeader + 4, BIN_CHUNK, true);
  out.set(bin, binHeader + 8);
  return out;
}
