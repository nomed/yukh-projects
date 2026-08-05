#!/usr/bin/env node
import { createRequire as __yukhCreateRequire } from "node:module";
const require=__yukhCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP2 = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias3 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap3 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP2;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar3 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq3 = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP2:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP2:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar3(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP2;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias3;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap3;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar3;
    exports.isSeq = isSeq3;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path) {
      if (typeof visitor === "function")
        return visitor(key, node, path);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value2, arg, ctx) {
      if (Array.isArray(value2))
        return value2.map((v, i) => toJS(v, String(i), ctx));
      if (value2 && typeof value2.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value2))
          return value2.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value2, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value2.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value2 === "bigint" && !ctx?.keep)
        return Number(value2);
      return value2;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (data?.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value2) => !value2 || typeof value2 !== "function" && typeof value2 !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value2) {
        super(identity.SCALAR);
        this.value = value2;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value2, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value2) && !t.format);
    }
    function createNode(value2, tagName, ctx) {
      if (identity.isDocument(value2))
        value2 = value2.contents;
      if (identity.isNode(value2))
        return value2;
      if (identity.isPair(value2)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value2);
        return map;
      }
      if (value2 instanceof String || value2 instanceof Number || value2 instanceof Boolean || typeof BigInt !== "undefined" && value2 instanceof BigInt) {
        value2 = value2.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value2 && typeof value2 === "object") {
        ref = sourceObjects.get(value2);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value2));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value2, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value2, tagName, schema.tags);
      if (!tagObj) {
        if (value2 && typeof value2.toJSON === "function") {
          value2 = value2.toJSON();
        }
        if (!value2 || typeof value2 !== "object") {
          const node2 = new Scalar.Scalar(value2);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value2 instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value2) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value2, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value2, ctx) : new Scalar.Scalar(value2);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path, value2) {
      let v = value2;
      for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value2) {
        if (isEmptyPath(path))
          this.add(value2);
        else {
          const [key, ...rest] = path;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value2);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value2));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value2) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
          this.set(key, value2);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value2);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value2));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text5, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text5;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text5.length <= endStep)
        return text5;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text5, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text5[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text5[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text5, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text5[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text5[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text5;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text5;
      if (onFold)
        onFold();
      let res = text5.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text5.length;
        if (fold === 0)
          res = `
${indent}${text5.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text5[fold]}\\`;
          res += `
${indent}${text5.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text5, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text5[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text5[++i];
        } else {
          do {
            ch = text5[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text5[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value2, ctx) {
      const json = JSON.stringify(value2);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value2) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value2, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value2.includes("\n") || /[ \t]\n|\n[ \t]/.test(value2))
        return doubleQuotedString(value2, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value2) ? "  " : "");
      const res = "'" + value2.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value2, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value2.includes('"');
        const hasSingle = value2.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value2, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value: value2 }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value2)) {
        return quotedString(value2, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value2) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value2, lineWidth, indent.length);
      if (!value2)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value2.length; endStart > 0; --endStart) {
        const ch = value2[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value2.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value2 === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value2 = value2.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value2.length; ++startEnd) {
        const ch = value2[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value2.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value2 = value2.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value2.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value2 = value2.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value2}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value: value2 } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value2.includes("\n") || inFlow && /[[\]{},]/.test(value2)) {
        return quotedString(value2, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value2)) {
        return implicitKey || inFlow || !value2.includes("\n") ? quotedString(value2, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value2.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value2)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value2, ctx);
        }
      }
      const str = value2.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value2, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value: value2 }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value2 == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value2 == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value2 == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value2)) {
        vsb = !!value2.spaceBefore;
        vcb = value2.commentBefore;
        valueComment = value2.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value2 && typeof value2 === "object")
          value2 = doc.createNode(value2);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value2))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value2) && !value2.flow && !value2.tag && !value2.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value2, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value2)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value2.flow ?? value2.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value2) => value2 === MERGE_KEY || typeof value2 === "symbol" && value2.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value2) {
      const source = resolveAliasValue(ctx, value2);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value2) {
      const source = resolveAliasValue(ctx, value2);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value3] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value3);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value3,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value2) {
      return ctx && identity.isAlias(value2) ? value2.resolve(ctx.doc, ctx) : value2;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value: value2 }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value2);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value2);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value2, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value2, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value2, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value2, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value2 = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value2;
      }
      clone(schema) {
        let { key, value: value2 } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value2))
          value2 = value2.clone(schema);
        return new _Pair(key, value2);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add4 = (key, value2) => {
          if (typeof replacer === "function")
            value2 = replacer.call(obj, key, value2);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value2 !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value2, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value2] of obj)
            add4(key, value2);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add4(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value2) {
        this.add(new Pair.Pair(key, value2), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value2) {
        this.items.push(value2);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value2) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value2))
          prev.value = value2;
        else
          this.items[idx] = value2;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string2 = {
      identify: (value2) => typeof value2 === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string2;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value2) => value2 == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value2) => typeof value2 === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value: value2 }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value2 === sv)
            return source;
        }
        return value2 ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value: value2 }) {
      if (typeof value2 === "bigint")
        return String(value2);
      const num = typeof value2 === "number" ? value2 : Number(value2);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value2, -0) ? "-0" : JSON.stringify(value2);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value2) => typeof value2 === "bigint" || Number.isInteger(value2);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value: value2 } = node;
      if (intIdentify(value2) && value2 >= 0)
        return prefix + value2.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value2) => intIdentify(value2) && value2 >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value2) => intIdentify(value2) && value2 >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string2 = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string2.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value2) {
      return typeof value2 === "bigint" || Number.isInteger(value2);
    }
    var stringifyJSON = ({ value: value2 }) => JSON.stringify(value2);
    var jsonScalars = [
      {
        identify: (value2) => typeof value2 === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value2) => value2 == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value2) => typeof value2 === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value: value2 }) => intIdentify(value2) ? value2.toString() : JSON.stringify(value2)
      },
      {
        identify: (value2) => typeof value2 === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value2) => value2 instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value: value2 }, ctx, onComment, onChompKeep) {
        if (!value2)
          return "";
        const buf = value2;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value2;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value2 = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys2 = Object.keys(it);
            if (keys2.length === 1) {
              key = keys2[0];
              value2 = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys2.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value2, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value2;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value2 = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value2);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value2) => value2 instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value: value2, source }, ctx) {
      const boolObj = value2 ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value2 ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value2) => value2 === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value2) => value2 === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value2) => typeof value2 === "bigint" || Number.isInteger(value2);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign2 = str[0];
      if (sign2 === "-" || sign2 === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign2 === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign2 === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value: value2 } = node;
      if (intIdentify(value2)) {
        const str = value2.toString(radix);
        return value2 < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value2) {
        if (typeof value2 !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value2}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value2) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value2) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value2 of iterable) {
            if (typeof replacer === "function")
              value2 = replacer.call(iterable, value2, value2);
            set2.items.push(Pair.createPair(value2, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value2) => value2 instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign2 = str[0];
      const parts = sign2 === "-" || sign2 === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign2 === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value: value2 } = node;
      let num = (n) => n;
      if (typeof value2 === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value2) || !isFinite(value2))
        return stringifyNumber.stringifyNumber(node);
      let sign2 = "";
      if (value2 < 0) {
        sign2 = "-";
        value2 *= num(-1);
      }
      const _60 = num(60);
      const parts = [value2 % _60];
      if (value2 < 60) {
        parts.unshift(0);
      } else {
        value2 = (value2 - parts[0]) / _60;
        parts.unshift(value2 % _60);
        if (value2 >= 60) {
          value2 = (value2 - parts[0]) / _60;
          parts.unshift(value2);
        }
      }
      return sign2 + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value2) => typeof value2 === "bigint" || Number.isInteger(value2),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value2) => typeof value2 === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value2) => value2 instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value: value2 }) => value2?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string2 = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string2.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string2 = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string2.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys2 = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys2} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys2 = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys2}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string2 = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string2.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value2, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value2 === void 0 ? null : this.createNode(value2, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value2) {
        if (assertCollection(this.contents))
          this.contents.add(value2);
      }
      /** Adds a value to the document. */
      addIn(path, value2) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value2);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value2, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value2 = replacer.call({ "": value2 }, "", value2);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value2, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value2, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value2, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value2) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value2);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value2);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value2) {
        if (Collection.isEmptyPath(path)) {
          this.contents = value2;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value2);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value2);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep: sep3, value: value2 } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep3?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep3) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep3 ?? [], {
          indicator: "map-value-ind",
          next: value2,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value2?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value2 ? composeNode(ctx, value2, valueProps, onError) : composeEmptyNode(ctx, offset, sep3, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value2, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value: value2 } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value2,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value2) {
            if (value2?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value2 ? composeNode(ctx, value2, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value2, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep3 = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep3 + cb;
              sep3 = "";
              break;
            }
            case "newline":
              if (comment)
                sep3 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap3 = fc.start.source === "{";
      const fcName = isMap3 ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap3 ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep: sep3, value: value2 } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep3?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep3 && !value2) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap3 && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap3 && !sep3 && !props.found) {
          const valueNode = value2 ? composeNode(ctx, value2, props, onError) : composeEmptyNode(ctx, props.end, sep3, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value2))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep3 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value2,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap3 && !props.found && ctx.options.strict) {
              if (sep3)
                for (const st of sep3) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value2) {
            if ("source" in value2 && value2.source?.[0] === ":")
              onError(value2, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value2 ? composeNode(ctx, value2, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep3, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value2))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap3) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap3 ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value3 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value3, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value2 = "";
      let sep3 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value2 += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value2 += sep3 + indent.slice(trimIndent) + content;
          sep3 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep3 === " ")
            sep3 = "\n";
          else if (!prevMoreIndented && sep3 === "\n")
            sep3 = "\n\n";
          value2 += sep3 + indent.slice(trimIndent) + content;
          sep3 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep3 === "\n")
            value2 += "\n";
          else
            sep3 = "\n";
        } else {
          value2 += sep3 + content;
          sep3 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value2 += "\n" + lines[i][0].slice(trimIndent);
          if (value2[value2.length - 1] !== "\n")
            value2 += "\n";
          break;
        default:
          value2 += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value: value2, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value2;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value2 = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value2 = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value2 = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value: value2,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep3 = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep3 === "\n")
            res += sep3;
          else
            sep3 = "\n";
        } else {
          res += sep3 + match[1];
          sep3 = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep3 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw2 = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw2}`);
            res += raw2;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw2 = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw2}`);
        return raw2;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value: value2, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value2, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value2, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value2, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value2);
      }
      scalar.range = range;
      scalar.source = value2;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value2, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value2))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value2, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value2)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value2)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value: value2, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value2 ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value2 && (value2.type === "block-map" || value2.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value2 ? composeNode.composeNode(ctx, value2, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (false)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value2, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value: value2 }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value2, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value: value2 }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep: sep3, value: value2 }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep3)
        for (const st of sep3)
          res += st.source;
      if (value2)
        res += stringifyToken(value2);
      return res;
    }
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path) => {
      let item = cst;
      for (const [field2, index] of path) {
        const tok = item?.[field2];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path) => {
      const parent = visit.itemAtPath(cst, path.slice(0, -1));
      const field2 = path[path.length - 1][0];
      const coll = parent?.[field2];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path, item, visitor) {
      let ctrl = visitor(item, path);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field2 of ["key", "value"]) {
        const token = item[field2];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path.concat([[field2, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field2 === "key")
            ctrl = ctrl(item, path);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar3 = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar3;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list2, type) {
      for (let i = 0; i < list2.length; ++i)
        if (list2[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list2) {
      for (let i = 0; i < list2.length; ++i) {
        switch (list2[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (false)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep3;
          if (scalar.end) {
            sep3 = scalar.end;
            sep3.push(this.sourceToken);
            delete scalar.end;
          } else
            sep3 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep3 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep3 = it.sep;
                  sep3.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep: sep3 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep3 = fc.end.splice(1, fc.end.length);
            sep3.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep3 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments4(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value2, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value2 === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value2) && !_replacer)
        return value2.toString(options);
      return new Document.Document(value2, _replacer, options).toString(options);
    }
    exports.parse = parse;
    exports.parseAllDocuments = parseAllDocuments4;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// src/runtime-input.ts
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
var OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
var REPOSITORY = /^[A-Za-z0-9_.-]{1,100}$/u;
var DECIMAL = /^[1-9][0-9]{0,9}$/u;
function parseRuntimeScope(input2) {
  if (!OWNER.test(input2.owner) || !REPOSITORY.test(input2.repository) || input2.repository === "." || input2.repository === ".." || !DECIMAL.test(input2.projectNumber) || !DECIMAL.test(input2.issueNumber)) throw new TypeError("invalid runtime input");
  const projectNumber = Number(input2.projectNumber), issueNumber2 = Number(input2.issueNumber);
  if (projectNumber > 2147483647 || issueNumber2 > 2147483647) throw new TypeError("invalid runtime input");
  return { ownerLogin: input2.owner, repositoryName: input2.repository, projectNumber, issueNumber: issueNumber2 };
}
async function loadWorkspacePolicy(workspace, policyPath = ".yukh/project.yaml") {
  if (!policyPath || isAbsolute(policyPath) || policyPath.split(/[\\/]/u).includes("..") || /[\u0000-\u001f\u007f]/u.test(policyPath)) throw new TypeError("invalid policy path");
  const root = await realpath(workspace), candidate = resolve(root, policyPath), resolved = await realpath(candidate);
  const rel = relative(root, resolved);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new TypeError("invalid policy path");
  const metadata = await lstat(candidate);
  if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.size > 64 * 1024) throw new TypeError("invalid policy file");
  const source = await readFile(resolved, "utf8");
  if (Buffer.byteLength(source, "utf8") > 64 * 1024) throw new TypeError("invalid policy file");
  return source;
}

// src/apply-runtime-input.ts
import { constants, createReadStream } from "node:fs";
import { open as open2, realpath as realpath2 } from "node:fs/promises";
import { basename, dirname as dirname2, isAbsolute as isAbsolute2, relative as relative2, resolve as resolve2, sep as sep2 } from "node:path";
var VALUES = /* @__PURE__ */ new Set(["--mode", "--owner", "--repository", "--project-number", "--issue-number", "--policy-path", "--approved-plan-id", "--approval-file", "--approval-public-key-file", "--environment", "--github-read-token-fd", "--github-write-token-fd", "--host-capsule-fd"]);
var DIGEST = /^[a-f0-9]{64}$/u;
var FD = /^(?:[3-9][0-9]{0,2}|1[0-9]{3})$/u;
function bounded(value2, max = 256) {
  return value2.length > 0 && value2.length <= max && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function fd(value2) {
  if (!value2 || !FD.test(value2)) throw new TypeError("invalid apply arguments");
  const parsed = Number(value2);
  if (!Number.isSafeInteger(parsed) || parsed > 1024) throw new TypeError("invalid apply arguments");
  return parsed;
}
function parseApplyCliArgs(argv) {
  const values = /* @__PURE__ */ new Map();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (!VALUES.has(key) || values.has(key)) throw new TypeError("invalid apply arguments");
    const value2 = argv[++index];
    if (value2 === void 0 || value2.startsWith("--") || !bounded(value2, 1024)) throw new TypeError("invalid apply arguments");
    values.set(key, value2);
  }
  for (const key of VALUES) if (key !== "--policy-path" && !values.has(key)) throw new TypeError("invalid apply arguments");
  if (values.get("--mode") !== "apply" || !DIGEST.test(values.get("--approved-plan-id") ?? "") || !bounded(values.get("--environment") ?? "", 64)) throw new TypeError("invalid apply arguments");
  parseRuntimeScope({ owner: values.get("--owner"), repository: values.get("--repository"), projectNumber: values.get("--project-number"), issueNumber: values.get("--issue-number") });
  const readTokenFd = fd(values.get("--github-read-token-fd")), writeTokenFd = fd(values.get("--github-write-token-fd")), hostCapsuleFd = fd(values.get("--host-capsule-fd"));
  if ((/* @__PURE__ */ new Set([readTokenFd, writeTokenFd, hostCapsuleFd])).size !== 3) throw new TypeError("invalid apply arguments");
  return { mode: "apply", owner: values.get("--owner"), repository: values.get("--repository"), projectNumber: values.get("--project-number"), issueNumber: values.get("--issue-number"), policyPath: values.get("--policy-path") ?? ".yukh/project.yaml", approvedPlanId: values.get("--approved-plan-id"), approvalFile: values.get("--approval-file"), approvalPublicKeyFile: values.get("--approval-public-key-file"), environment: values.get("--environment"), readTokenFd, writeTokenFd, hostCapsuleFd };
}
async function readBoundedFd(fdValue, maxBytes = 8192) {
  if (!Number.isSafeInteger(fdValue) || fdValue < 3 || fdValue > 1024 || maxBytes < 1 || maxBytes > 64 * 1024) throw new TypeError("invalid credential descriptor");
  let bytes = 0, value2 = "";
  for await (const chunk of createReadStream("", { fd: fdValue, autoClose: true })) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes) throw new TypeError("invalid credential");
    value2 += buffer.toString("utf8");
  }
  value2 = value2.replace(/\r?\n$/u, "");
  if (!value2 || /[\u0000-\u001f\u007f]/u.test(value2)) throw new TypeError("invalid credential");
  return value2;
}
async function readExclusiveWorkspaceFile(workspace, filePath, maxBytes = 64 * 1024) {
  if (!bounded(filePath, 1024) || isAbsolute2(filePath) || filePath.split(/[\\/]/u).includes("..") || maxBytes < 1 || maxBytes > 1024 * 1024) throw new TypeError("invalid protected file");
  const root = await realpath2(workspace), candidate = resolve2(root, filePath), parent = await realpath2(dirname2(candidate)), rel = relative2(root, parent);
  if (rel === ".." || rel.startsWith(`..${sep2}`) || isAbsolute2(rel)) throw new TypeError("invalid protected file");
  const resolved = resolve2(parent, basename(candidate)), handle = await open2(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size < 1 || metadata.size > maxBytes) throw new TypeError("invalid protected file");
    const value2 = await handle.readFile();
    if (value2.length < 1 || value2.length > maxBytes) throw new TypeError("invalid protected file");
    return value2;
  } finally {
    await handle.close();
  }
}
async function readApprovalArtifact(workspace, filePath) {
  const bytes = await readExclusiveWorkspaceFile(workspace, filePath);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new TypeError("invalid approval artifact");
  }
}

// src/apply-approval.ts
import { createHash as createHash2, createPublicKey, verify } from "node:crypto";

// src/planner.ts
import { createHash } from "node:crypto";
var MESSAGES = {
  "YKP-PLAN-001": "input boundary is invalid",
  "YKP-PLAN-002": "effective schema is not executable",
  "YKP-PLAN-003": "required managed field binding is missing",
  "YKP-PLAN-004": "policy field is incompatible with contract value",
  "YKP-PLAN-005": "policy vocabulary value cannot be resolved",
  "YKP-PLAN-006": "observed value is invalid",
  "YKP-PLAN-007": "operation dependency is invalid or cyclic",
  "YKP-GRAPH-001": "relationship graph limit is exceeded",
  "YKP-GRAPH-002": "relationship edge is invalid",
  "YKP-GRAPH-003": "parent cardinality conflicts",
  "YKP-GRAPH-004": "parent cycle is detected",
  "YKP-GRAPH-005": "dependency cycle is detected",
  "YKP-GRAPH-006": "relationship declaration is contradictory",
  "YKP-REPORT-001": "value cannot be safely rendered"
};
function add(target, code, path) {
  target.push({ code, path, severity: "error", message: MESSAGES[code], offset: Number.MAX_SAFE_INTEGER });
}
function diagnostics(source) {
  const seen = /* @__PURE__ */ new Set();
  return source.sort((a, b) => compareText(a.code, b.code) || compareText(a.path, b.path)).filter((item) => {
    const key = `${item.code}\0${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ offset: _offset, ...item }) => item);
}
function boundedRef(value2) {
  return typeof value2 === "string" && [...value2].length > 0 && [...value2].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function safeString(value2, max = 512) {
  return typeof value2 === "string" && [...value2].length <= max && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function canonicalValue(value2) {
  if (Array.isArray(value2)) return value2.map(canonicalValue);
  if (value2 && typeof value2 === "object") return Object.fromEntries(Object.entries(value2).sort(([a], [b]) => compareText(a, b)).map(([key, item]) => [key, canonicalValue(item)]));
  if (typeof value2 === "number" && !Number.isFinite(value2)) throw new TypeError("non-finite canonical number");
  return value2;
}
function canonicalJson(value2) {
  return JSON.stringify(canonicalValue(value2));
}
function planId(plan) {
  return createHash("sha256").update(canonicalJson(plan), "utf8").digest("hex");
}
function opKey(...parts) {
  return parts.join(".");
}
var FIELD_MAP = [
  { source: (c) => c.work_type, fieldKey: "work_type", kind: "single_select", path: "$.contract.work_type" },
  { source: (c) => c.area, fieldKey: "area", kind: "single_select", path: "$.contract.area" },
  { source: (c) => c.priority, fieldKey: "priority", kind: "single_select", path: "$.contract.priority" },
  { source: (c) => c.size, fieldKey: "size", kind: "single_select", path: "$.contract.size" },
  { source: (c) => c.estimate, fieldKey: "estimate", kind: "number", path: "$.contract.estimate" },
  { source: (c) => c.iteration, fieldKey: "iteration", kind: "iteration", path: "$.contract.iteration" },
  { source: (c) => c.project?.status, fieldKey: "status", kind: "single_select", path: "$.contract.project.status" },
  { source: (c) => c.project?.start_date, fieldKey: "start_date", kind: "date", path: "$.contract.project.start_date" },
  { source: (c) => c.project?.target_date, fieldKey: "target_date", kind: "date", path: "$.contract.project.target_date" }
];
function operationFromSchema(operation, scope) {
  if (operation.type === "create_field") return {
    operationKey: opKey("schema", "field", operation.fieldKey, "create"),
    type: "create_field",
    subject: { ref: scope.subjectRef },
    resource: { kind: "project_field", logicalKey: operation.fieldKey, scopeRef: scope.projectRef },
    action: "create",
    environment: "dry-run",
    reason: "schema.field.missing",
    preconditions: [{ kind: "field_absent", logicalKey: operation.fieldKey, expected: true }],
    dependsOn: []
  };
  if (operation.type === "add_option") return {
    operationKey: opKey("schema", "field", operation.fieldKey, "option", operation.optionKey, "add"),
    type: "add_option",
    subject: { ref: scope.subjectRef },
    resource: { kind: "project_option", logicalKey: `${operation.fieldKey}.${operation.optionKey}`, scopeRef: scope.projectRef, providerRef: operation.fieldProviderId },
    action: "add",
    environment: "dry-run",
    reason: "schema.option.missing",
    preconditions: [{ kind: "option_absent", logicalKey: operation.optionKey, expected: true }],
    dependsOn: []
  };
  return null;
}
function hasCycle(nodes, edges) {
  const adjacent = /* @__PURE__ */ new Map();
  nodes.forEach((node) => adjacent.set(node, []));
  edges.forEach((edge) => adjacent.get(edge.from)?.push(edge.to));
  const visiting = /* @__PURE__ */ new Set();
  const visited = /* @__PURE__ */ new Set();
  const visit = (node) => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of adjacent.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return nodes.some(visit);
}
function edgeKey(edge) {
  return `${edge.from}->${edge.to}`;
}
function validateGraph(graph, internal) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.parent) || !Array.isArray(graph.blocks) || graph.nodes.length > 512 || graph.parent.length > 511 || graph.blocks.length > 4096) {
    add(internal, "YKP-GRAPH-001", "$.relationships");
    return;
  }
  const nodes = /* @__PURE__ */ new Set();
  graph.nodes.forEach((node, index) => {
    if (!Number.isSafeInteger(node) || node <= 0 || nodes.has(node)) add(internal, "YKP-GRAPH-002", `$.relationships.nodes[${index}]`);
    else nodes.add(node);
  });
  const validate = (edges, name) => {
    const seen = /* @__PURE__ */ new Set();
    const parents = /* @__PURE__ */ new Set();
    edges.forEach((edge, index) => {
      const path = `$.relationships.${name}[${index}]`;
      const key = edgeKey(edge);
      if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to || seen.has(key)) add(internal, "YKP-GRAPH-002", path);
      else seen.add(key);
      if (name === "parent" && parents.has(edge.from)) add(internal, "YKP-GRAPH-003", path);
      else if (name === "parent") parents.add(edge.from);
    });
  };
  validate(graph.parent, "parent");
  validate(graph.blocks, "blocks");
  if (internal.length === 0 && hasCycle(graph.nodes, graph.parent)) add(internal, "YKP-GRAPH-004", "$.relationships.parent");
  if (internal.length === 0 && hasCycle(graph.nodes, graph.blocks)) add(internal, "YKP-GRAPH-005", "$.relationships.blocks");
}
function planReconciliation(input2) {
  const internal = [];
  const operations = [];
  const observations = [];
  const scope = input2?.scope;
  if (!scope || !boundedRef(scope.subjectRef) || !boundedRef(scope.repositoryRef) || !boundedRef(scope.projectRef) || !boundedRef(scope.issueRef) || !Number.isSafeInteger(scope.issueNumber) || scope.issueNumber <= 0) add(internal, "YKP-PLAN-001", "$.scope");
  if (!input2?.schema?.executable || input2.schema.diagnostics.length > 0) add(internal, "YKP-PLAN-002", "$.schema");
  const observed = input2?.observedItem;
  if (!observed || !boundedRef(observed.fingerprint) || !observed.values || Object.keys(observed.values).length > 64) add(internal, "YKP-PLAN-001", "$.observedItem");
  else for (const [key, value2] of Object.entries(observed.values)) if (!/^[a-z][a-z0-9_]{0,63}$/u.test(key) || !(typeof value2 === "number" && Number.isFinite(value2) || value2 === null || safeString(value2))) add(internal, "YKP-PLAN-006", `$.observedItem.values.${key}`);
  validateGraph(input2.relationships, internal);
  if (scope && input2.relationships && !input2.relationships.nodes.includes(scope.issueNumber)) add(internal, "YKP-GRAPH-002", "1relationships.nodes");
  if (internal.length > 0) return finishPlan(internal, operations, observations);
  input2.schema.operations.map((operation) => operationFromSchema(operation, scope)).filter((operation) => operation !== null).forEach((operation) => operations.push(operation));
  for (const mapping of FIELD_MAP) {
    const raw2 = mapping.source(input2.contract);
    if (raw2 === void 0) continue;
    const declaration = input2.policy.fields[mapping.fieldKey];
    if (!declaration) {
      add(internal, "YKP-PLAN-003", `$.policy.fields.${mapping.fieldKey}`);
      continue;
    }
    if (declaration.mode !== "managed" || declaration.kind !== mapping.kind) {
      add(internal, "YKP-PLAN-004", `$.policy.fields.${mapping.fieldKey}`);
      continue;
    }
    let desired;
    let optionKey;
    if (mapping.kind === "single_select") {
      if (typeof raw2 !== "string" || !declaration.options?.[raw2]) {
        add(internal, "YKP-PLAN-005", mapping.path);
        continue;
      }
      optionKey = raw2;
      desired = declaration.options[raw2];
    } else {
      if (!(typeof raw2 === "number" && Number.isFinite(raw2) || safeString(raw2))) {
        add(internal, "YKP-PLAN-006", mapping.path);
        continue;
      }
      desired = raw2;
    }
    const previous = input2.observedItem.values[mapping.fieldKey] ?? null;
    if (previous === desired) {
      observations.push({ type: "preserve_field_value", logicalKey: mapping.fieldKey, displayValue: desired });
      continue;
    }
    const fieldCreate = opKey("schema", "field", mapping.fieldKey, "create");
    const optionAdd = optionKey ? opKey("schema", "field", mapping.fieldKey, "option", optionKey, "add") : void 0;
    const dependencies = operations.filter((operation) => operation.operationKey === fieldCreate || operation.operationKey === optionAdd).map((operation) => operation.operationKey).sort();
    operations.push({
      operationKey: opKey("item", "field", mapping.fieldKey, "set"),
      type: "set_field_value",
      subject: { ref: scope.subjectRef },
      resource: { kind: "project_item_field", logicalKey: mapping.fieldKey, scopeRef: scope.projectRef },
      action: "set",
      environment: "dry-run",
      reason: "item.value.differs",
      preconditions: [{ kind: "item_fingerprint", logicalKey: "item", expected: input2.observedItem.fingerprint }, { kind: "old_value", logicalKey: mapping.fieldKey, expected: previous }],
      dependsOn: dependencies,
      desired
    });
  }
  const current = scope.issueNumber;
  const nodes = new Set(input2.relationships.nodes);
  const desiredBlocks = new Set(input2.contract.relationships?.blocks ?? []);
  const desiredBlockedBy = new Set(input2.contract.relationships?.blocked_by ?? []);
  for (const issue of desiredBlocks) if (desiredBlockedBy.has(issue)) add(internal, "YKP-GRAPH-006", "$.contract.relationships");
  const parent = input2.contract.relationships?.parent;
  const proposedParent = [...input2.relationships.parent];
  if (parent !== void 0) {
    if (!nodes.has(parent) || !nodes.has(current)) add(internal, "YKP-GRAPH-002", "$.contract.relationships.parent");
    else {
      const existing = input2.relationships.parent.find((edge) => edge.from === current);
      if (existing?.to === parent) observations.push({ type: "preserve_parent", logicalKey: "parent", displayValue: parent });
      else if (existing) add(internal, "YKP-GRAPH-003", "$.contract.relationships.parent");
      else {
        proposedParent.push({ from: current, to: parent });
        operations.push({ operationKey: opKey("relationship", "parent", parent, "set"), type: "set_parent", subject: { ref: scope.subjectRef }, resource: { kind: "issue_parent", logicalKey: "parent", scopeRef: scope.repositoryRef }, action: "set", environment: "dry-run", reason: "relationship.parent.missing", preconditions: [{ kind: "parent_absent", logicalKey: "parent", expected: true }], dependsOn: [], desired: parent });
      }
    }
  }
  const proposedBlocks = [...input2.relationships.blocks];
  const desiredEdges = [...desiredBlocks].map((to) => ({ from: current, to }));
  desiredBlockedBy.forEach((from) => desiredEdges.push({ from, to: current }));
  if (desiredEdges.length + (parent === void 0 ? 0 : 1) > 100) add(internal, "YKP-GRAPH-001", "1contract.relationships");
  desiredEdges.sort((a, b) => a.from - b.from || a.to - b.to).forEach((edge) => {
    const path = "1contract.relationships";
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) {
      add(internal, "YKP-GRAPH-002", path);
      return;
    }
    if (input2.relationships.blocks.some((existing) => edgeKey(existing) === edgeKey(edge))) observations.push({ type: "preserve_dependency", logicalKey: edgeKey(edge), displayValue: edge.to });
    else {
      proposedBlocks.push(edge);
      operations.push({ operationKey: opKey("relationship", "dependency", edge.from, edge.to, "add"), type: "add_dependency", subject: { ref: scope.subjectRef }, resource: { kind: "issue_dependency", logicalKey: edgeKey(edge), scopeRef: scope.repositoryRef }, action: "add", environment: "dry-run", reason: "relationship.dependency.missing", preconditions: [{ kind: "dependency_absent", logicalKey: edgeKey(edge), expected: true }], dependsOn: [], desired: edge.to });
    }
  });
  if (hasCycle(input2.relationships.nodes, proposedParent)) add(internal, "YKP-GRAPH-004", "$.contract.relationships.parent");
  if (hasCycle(input2.relationships.nodes, proposedBlocks)) add(internal, "YKP-GRAPH-005", "$.contract.relationships.blocks");
  return finishPlan(internal, operations, observations);
}
var PHASE = { create_field: 0, add_option: 1, set_field_value: 2, set_issue_type: 2, set_parent: 3, add_dependency: 4 };
function finishPlan(internal, operations, observations) {
  operations.sort((a, b) => PHASE[a.type] - PHASE[b.type] || compareText(a.resource.logicalKey, b.resource.logicalKey) || compareText(a.operationKey, b.operationKey));
  observations.sort((a, b) => compareText(a.type, b.type) || compareText(a.logicalKey, b.logicalKey));
  const found = diagnostics(internal);
  const base = { schema: 1, executable: found.length === 0, diagnostics: found, observations, operations };
  return { ...base, planId: planId(base) };
}

// src/apply-approval.ts
var APPLY_VERSIONS = { contract: "controlled-apply-v1", planner: "reconciliation-plan-v1", snapshot: "rest-project-snapshot-v2", entrypoint: "apply-entrypoint-v1" };
var DIGEST2 = /^[a-f0-9]{64}$/u;
var SIGNATURE = /^[A-Za-z0-9_-]{86}$/u;
var CLAIM_KEYS = ["schema", "issuerRef", "subjectRef", "repositoryRef", "projectRef", "issueRef", "issueNumber", "scopeDigest", "planId", "operationDigest", "environment", "protectedEnvironment", "issuedAtMs", "expiresAtMs", "nonce", "keyFingerprint", "contractVersion", "plannerVersion", "snapshotVersion", "entrypointVersion"];
var ENVELOPE_KEYS = ["schema", "algorithm", "keyFingerprint", "claims", "signature"];
function exactKeys(value2, keys2) {
  return !!value2 && typeof value2 === "object" && !Array.isArray(value2) && Object.keys(value2).length === keys2.length && Object.keys(value2).every((key) => keys2.includes(key));
}
function bounded2(value2, max = 256) {
  return typeof value2 === "string" && value2.length > 0 && value2.length <= max && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function publicKey(value2) {
  try {
    const key = createPublicKey(value2);
    if (key.asymmetricKeyType !== "ed25519") return null;
    const der = key.export({ type: "spki", format: "der" });
    return { key, fingerprint: createHash2("sha256").update(der).digest("hex") };
  } catch {
    return null;
  }
}
function claimsShape(value2) {
  if (!exactKeys(value2, CLAIM_KEYS)) return false;
  const c = value2;
  return c.schema === 1 && bounded2(c.issuerRef) && bounded2(c.subjectRef) && bounded2(c.repositoryRef) && bounded2(c.projectRef) && bounded2(c.issueRef) && Number.isSafeInteger(c.issueNumber) && c.issueNumber > 0 && DIGEST2.test(c.scopeDigest) && DIGEST2.test(c.planId) && DIGEST2.test(c.operationDigest) && c.environment === "apply" && bounded2(c.protectedEnvironment, 64) && Number.isSafeInteger(c.issuedAtMs) && Number.isSafeInteger(c.expiresAtMs) && bounded2(c.nonce) && DIGEST2.test(c.keyFingerprint) && c.contractVersion === APPLY_VERSIONS.contract && c.plannerVersion === APPLY_VERSIONS.planner && c.snapshotVersion === APPLY_VERSIONS.snapshot && c.entrypointVersion === APPLY_VERSIONS.entrypoint;
}
function signatureInput(envelope) {
  return Buffer.from(`yukh-projects-approval-v1\0${canonicalJson(envelope)}`, "utf8");
}
function verifySignedApproval(artifact, trust) {
  if (!exactKeys(artifact, ENVELOPE_KEYS)) return null;
  const envelope = artifact;
  if (envelope.schema !== 1 || envelope.algorithm !== "Ed25519" || !DIGEST2.test(envelope.keyFingerprint) || !SIGNATURE.test(envelope.signature) || !claimsShape(envelope.claims)) return null;
  const trusted = publicKey(trust.publicKey);
  if (!trusted || trusted.fingerprint !== envelope.keyFingerprint || envelope.claims.keyFingerprint !== trusted.fingerprint || !trust.allowedIssuerRefs.includes(envelope.claims.issuerRef)) return null;
  try {
    const signature = Buffer.from(envelope.signature, "base64url");
    if (signature.length !== 64 || !verify(null, signatureInput({ schema: 1, algorithm: "Ed25519", keyFingerprint: envelope.keyFingerprint, claims: envelope.claims }), trusted.key, signature)) return null;
  } catch {
    return null;
  }
  return { ...envelope.claims };
}

// src/apply-coordination.ts
import { createHash as createHash4 } from "node:crypto";

// src/executor.ts
import { createHash as createHash3 } from "node:crypto";
var ApplyPortError = class extends Error {
  constructor(failureClass) {
    super("apply port failed");
    this.failureClass = failureClass;
    this.name = "ApplyPortError";
  }
  failureClass;
};
var MESSAGE = { "YKP-APPLY-001": "apply request is invalid", "YKP-APPLY-002": "apply is not explicitly enabled", "YKP-APPLY-003": "approval is invalid or does not match", "YKP-APPLY-004": "approval is expired or has invalid lifetime", "YKP-APPLY-005": "operation is unsupported", "YKP-APPLY-006": "scope lease is unavailable or lost", "YKP-APPLY-007": "fresh preflight does not match approved plan", "YKP-APPLY-008": "approval nonce is already consumed", "YKP-APPLY-009": "operation precondition does not match", "YKP-APPLY-010": "mutation attempt failed", "YKP-APPLY-011": "operation verification failed", "YKP-APPLY-012": "final convergence verification failed", "YKP-APPLY-013": "provider authentication failed", "YKP-APPLY-014": "provider authorization failed", "YKP-APPLY-015": "provider budget is reserved", "YKP-APPLY-016": "provider is unavailable", "YKP-APPLY-017": "provider invariant is invalid" };
var MAP = { create_field: "create_project_field", add_option: "update_project_field_options", set_field_value: "update_project_item_field_value", set_issue_type: "set_issue_type", set_parent: "add_sub_issue", add_dependency: "add_blocked_by" };
function hash(v) {
  return createHash3("sha256").update(canonicalJson(v)).digest("hex");
}
function integrity(plan) {
  if (!plan || plan.schema !== 1 || !plan.executable || plan.diagnostics.length !== 0 || !Array.isArray(plan.operations) || !Array.isArray(plan.observations)) return false;
  const { planId: planId2, ...base } = plan;
  return /^[a-f0-9]{64}$/u.test(planId2) && hash(base) === planId2;
}
function bounded3(v) {
  return typeof v === "string" && [...v].length > 0 && [...v].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v);
}
function validScope(s) {
  return !!s && bounded3(s.subjectRef) && bounded3(s.repositoryRef) && bounded3(s.projectRef) && bounded3(s.issueRef) && Number.isSafeInteger(s.issueNumber) && s.issueNumber > 0;
}
function diag(code) {
  return { code, severity: "error", message: MESSAGE[code] };
}
function result(planId2, ops, states, code, remaining = ops.length) {
  return { schema: 1, status: code === "YKP-APPLY-015" ? "deferred" : code ? "error" : "success", planId: planId2, outcomes: ops.map((o) => ({ operationKey: o.operationKey, outcome: states.get(o.operationKey) ?? "not_attempted" })), remaining, diagnostics: code ? [diag(code)] : [] };
}
function portCode(error, fallback) {
  if (!(error instanceof ApplyPortError)) return fallback;
  const codes = { authentication: "YKP-APPLY-013", authorization: "YKP-APPLY-014", deferred_rate_budget: "YKP-APPLY-015", provider: "YKP-APPLY-016", invariant: "YKP-APPLY-017" };
  return codes[error.failureClass];
}
function claimsValid(c, request, now, scopeDigest) {
  return !!c && c.schema === 1 && bounded3(c.issuerRef) && c.subjectRef === request.scope.subjectRef && c.repositoryRef === request.scope.repositoryRef && c.projectRef === request.scope.projectRef && c.issueRef === request.scope.issueRef && c.issueNumber === request.scope.issueNumber && c.scopeDigest === scopeDigest && c.planId === request.approvedPlanId && /^[a-f0-9]{64}$/u.test(c.operationDigest) && c.environment === "apply" && bounded3(c.protectedEnvironment) && c.protectedEnvironment === request.protectedEnvironment && Number.isSafeInteger(c.issuedAtMs) && Number.isSafeInteger(c.expiresAtMs) && c.issuedAtMs <= now && c.expiresAtMs >= now && c.expiresAtMs - c.issuedAtMs <= 15 * 60 * 1e3 && bounded3(c.nonce) && [...c.nonce].length >= 22 && /^[a-f0-9]{64}$/u.test(c.keyFingerprint) && c.contractVersion === "controlled-apply-v1" && c.plannerVersion === "reconciliation-plan-v1" && c.snapshotVersion === "rest-project-snapshot-v2" && c.entrypointVersion === "apply-entrypoint-v1";
}
function dependenciesValid(ops) {
  const prior = /* @__PURE__ */ new Set();
  for (const op of ops) {
    if (!bounded3(op.operationKey) || op.environment !== "dry-run" || op.dependsOn.some((d) => !prior.has(d))) return false;
    prior.add(op.operationKey);
  }
  return prior.size === ops.length;
}
function operationsMatchScope(ops, scope) {
  return ops.every((op) => op.subject.ref === scope.subjectRef && (op.resource.scopeRef === scope.repositoryRef || op.resource.scopeRef === scope.projectRef));
}
async function executeControlledPlan(request, ports) {
  const planId2 = request?.approvedPlanId ?? "invalid", states = /* @__PURE__ */ new Map();
  let operations = [];
  if (!validScope(request?.scope) || !/^[a-f0-9]{64}$/u.test(planId2) || !bounded3(request?.protectedEnvironment)) return result(planId2, operations, states, "YKP-APPLY-001");
  if (request.enablement !== "apply-explicitly-enabled") return result(planId2, operations, states, "YKP-APPLY-002");
  const scopeDigest = hash(request.scope);
  let approval;
  try {
    approval = await ports.verifyApproval(request.approval);
  } catch {
    return result(planId2, operations, states, "YKP-APPLY-003");
  }
  const now = ports.nowMs();
  if (!claimsValid(approval, request, now, scopeDigest)) return result(planId2, operations, states, approval && approval.expiresAtMs < now ? "YKP-APPLY-004" : "YKP-APPLY-003");
  let lease = null;
  try {
    try {
      lease = await ports.acquireLease(scopeDigest);
    } catch (error) {
      return result(planId2, operations, states, portCode(error, "YKP-APPLY-006"));
    }
    if (!lease || !await lease.valid()) return result(planId2, operations, states, "YKP-APPLY-006");
    let fresh;
    try {
      fresh = await ports.replan();
    } catch (error) {
      return result(planId2, operations, states, portCode(error, "YKP-APPLY-017"));
    }
    operations = fresh?.operations ?? [];
    if (!integrity(fresh) || fresh.planId !== planId2 || !dependenciesValid(operations) || !operationsMatchScope(operations, request.scope) || hash(operations) !== approval.operationDigest) return result(planId2, operations, states, "YKP-APPLY-007");
    if (operations.some((op) => !MAP[op.type])) return result(planId2, operations, states, "YKP-APPLY-005");
    if (!await ports.consumeNonce(approval.nonce)) return result(planId2, operations, states, "YKP-APPLY-008");
    await ports.audit({ type: "apply_started", planId: planId2, outcome: "approved" });
    for (const op of operations) {
      if (!await lease.valid()) {
        await ports.audit({ type: "apply_stopped", planId: planId2, operationKey: op.operationKey, outcome: "lease_lost" });
        return result(planId2, operations, states, "YKP-APPLY-006");
      }
      if (op.dependsOn.some((d) => !["verified", "already_converged"].includes(states.get(d) ?? "not_attempted"))) return result(planId2, operations, states, "YKP-APPLY-009");
      let observed;
      try {
        observed = await ports.inspect(op);
      } catch (error) {
        return result(planId2, operations, states, portCode(error, "YKP-APPLY-009"));
      }
      if (observed === "already_converged") {
        states.set(op.operationKey, "already_converged");
        await ports.audit({ type: "operation", planId: planId2, operationKey: op.operationKey, outcome: "already_converged" });
        continue;
      }
      if (observed !== "ready") {
        states.set(op.operationKey, "failed");
        return result(planId2, operations, states, "YKP-APPLY-009");
      }
      if (!Number.isSafeInteger(lease.fencingToken) || lease.fencingToken < 1 || !await lease.valid()) return result(planId2, operations, states, "YKP-APPLY-006");
      const mutationKind = MAP[op.type];
      try {
        await ports.mutate(mutationKind, op, hash([planId2, op.operationKey]).slice(0, 64), lease.fencingToken);
      } catch (error) {
        states.set(op.operationKey, "failed");
        await ports.audit({ type: "operation", planId: planId2, operationKey: op.operationKey, outcome: "failed" });
        return result(planId2, operations, states, portCode(error, "YKP-APPLY-010"));
      }
      let verified = false;
      try {
        await ports.invalidateAfterMutation(mutationKind, op);
        verified = await ports.verify(op);
      } catch (error) {
        return result(planId2, operations, states, portCode(error, "YKP-APPLY-011"));
      }
      if (!verified) {
        states.set(op.operationKey, "failed");
        return result(planId2, operations, states, "YKP-APPLY-011");
      }
      states.set(op.operationKey, "verified");
      await ports.audit({ type: "operation", planId: planId2, operationKey: op.operationKey, outcome: "verified" });
    }
    let finalPlan;
    try {
      finalPlan = await ports.replan();
    } catch (error) {
      return result(planId2, operations, states, portCode(error, "YKP-APPLY-012"));
    }
    if (!integrity(finalPlan) || !finalPlan.executable || finalPlan.operations.length !== 0 || finalPlan.diagnostics.length !== 0) return result(planId2, operations, states, "YKP-APPLY-012", finalPlan.operations.length);
    await ports.audit({ type: "apply_finished", planId: planId2, outcome: "verified" });
    return result(planId2, operations, states, void 0, 0);
  } catch (error) {
    return result(planId2, operations, states, portCode(error, "YKP-APPLY-012"));
  } finally {
    if (lease) try {
      await lease.release();
    } catch {
    }
  }
}
function renderPublicApplyReport(value2) {
  const counts = { already_converged: 0, verified: 0, failed: 0, not_attempted: 0 };
  for (const item of value2.outcomes) counts[item.outcome]++;
  return { schema: 1, status: value2.status, planId: value2.planId, counts, remaining: value2.remaining, diagnostics: value2.diagnostics.map((d) => ({ ...d })) };
}

// src/apply-coordination.ts
var ApplyCoordinationError = class extends Error {
  constructor(code) {
    super("apply coordination failed");
    this.code = code;
    this.name = "ApplyCoordinationError";
  }
  code;
};
var DIGEST3 = /^[a-f0-9]{64}$/u;
function digest(value2) {
  return createHash4("sha256").update(value2).digest("hex");
}
function portFailure(error) {
  if (error instanceof ApplyCoordinationError) {
    if (error.code === "YKP-COORD-004") throw new ApplyPortError("authentication");
    if (error.code === "YKP-COORD-005") throw new ApplyPortError("authorization");
    if (error.code === "YKP-COORD-002") throw new ApplyPortError("provider");
    throw new ApplyPortError("invariant");
  }
  throw new ApplyPortError("provider");
}
function bindApplyCoordination(base, store, options) {
  if (!DIGEST3.test(options.holderDigest) || !Number.isSafeInteger(options.expiresAtMs) || !Number.isSafeInteger(options.epoch) || options.epoch < 1) throw new TypeError("invalid apply coordination binding");
  return { ...base, consumeNonce: async (nonce) => {
    try {
      return await store.consumeNonce({ keyDigest: digest(`nonce-key\0${nonce}`), valueDigest: digest(`nonce-value\0${nonce}`), expiresAtMs: options.expiresAtMs, epoch: options.epoch }) === "consumed";
    } catch (error) {
      return portFailure(error);
    }
  }, acquireLease: async (scopeDigest) => {
    let lease;
    try {
      lease = await store.acquireLease({ keyDigest: digest(`lease-key\0${scopeDigest}`), holderDigest: options.holderDigest, expiresAtMs: options.expiresAtMs, epoch: options.epoch });
    } catch (error) {
      return portFailure(error);
    }
    return lease ? { fencingToken: lease.fencingToken, valid: async () => {
      try {
        return await lease.valid();
      } catch (error) {
        return portFailure(error);
      }
    }, release: async () => {
      await lease.release();
    } } : null;
  } };
}

// src/apply-entrypoint.ts
async function runApplyEntrypoint(request, host) {
  const now = host.ports.nowMs();
  if (!Number.isSafeInteger(now)) throw new TypeError("invalid apply host clock");
  const ports = bindApplyCoordination({ ...host.ports, verifyApproval: async (artifact) => verifySignedApproval(artifact, { publicKey: request.approvalPublicKey, allowedIssuerRefs: host.allowedIssuerRefs }) }, host.coordinationStore, { holderDigest: host.holderDigest, expiresAtMs: now + 15 * 60 * 1e3, epoch: host.coordinationEpoch });
  return renderPublicApplyReport(await executeControlledPlan({ approvedPlanId: request.approvedPlanId, scope: request.scope, approval: request.approvalArtifact, enablement: host.enablement, protectedEnvironment: request.protectedEnvironment }, ports));
}

// src/apply-cli.ts
function failure(planId2) {
  return { schema: 1, status: "error", planId: /^[a-f0-9]{64}$/u.test(planId2) ? planId2 : "invalid", counts: { already_converged: 0, verified: 0, failed: 0, not_attempted: 0 }, remaining: 0, diagnostics: [{ code: "YKP-APPLY-001", severity: "error", message: "apply request is invalid" }] };
}
async function applyCliMain(argv, workspace, factory, write) {
  let approvedPlanId = "invalid";
  try {
    const options = parseApplyCliArgs(argv);
    approvedPlanId = options.approvedPlanId;
    const [readToken, writeToken, policySource, approvalArtifact, approvalPublicKey] = await Promise.all([readBoundedFd(options.readTokenFd), readBoundedFd(options.writeTokenFd), loadWorkspacePolicy(workspace, options.policyPath), readApprovalArtifact(workspace, options.approvalFile), readExclusiveWorkspaceFile(workspace, options.approvalPublicKeyFile)]);
    if (readToken === writeToken) throw new TypeError("credential profiles must be distinct");
    const requestedScope = parseRuntimeScope({ owner: options.owner, repository: options.repository, projectNumber: options.projectNumber, issueNumber: options.issueNumber }), runtime = await factory.create({ requestedScope, policySource, readToken, writeToken }), report = await runApplyEntrypoint({ approvedPlanId: options.approvedPlanId, protectedEnvironment: options.environment, scope: runtime.scope, approvalArtifact, approvalPublicKey }, runtime.host), receipt = report.status === "deferred" ? runtime.deferredReceipt?.() : void 0;
    write(`${JSON.stringify({ ...report, ...receipt ? { deferredReceipt: receipt } : {} })}
`);
    return report.status === "success" ? 0 : report.status === "deferred" ? 6 : 5;
  } catch {
    write(`${JSON.stringify(failure(approvedPlanId))}
`);
    return 2;
  }
}

// src/apply-coordination-http.ts
var MEDIA = "application/yukh-coordination-primitives+json;version=1";
var DIGEST4 = /^[a-f0-9]{64}$/u;
var MAX_BODY = 4096;
var MAX_CAPABILITY = 3800;
function canonical(value2) {
  if (value2 === null || typeof value2 === "boolean" || typeof value2 === "string") return JSON.stringify(value2);
  if (typeof value2 === "number") {
    if (!Number.isSafeInteger(value2)) throw new ApplyCoordinationError("YKP-COORD-001");
    return JSON.stringify(value2);
  }
  if (Array.isArray(value2)) return `[${value2.map(canonical).join(",")}]`;
  if (typeof value2 !== "object") throw new ApplyCoordinationError("YKP-COORD-001");
  const record2 = value2, keys2 = Object.keys(record2).sort();
  return `{${keys2.map((key) => `${JSON.stringify(key)}:${canonical(record2[key])}`).join(",")}}`;
}
function expiry(value2) {
  if (!Number.isSafeInteger(value2)) throw new ApplyCoordinationError("YKP-COORD-001");
  const formatted = new Date(value2).toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(formatted)) throw new ApplyCoordinationError("YKP-COORD-001");
  return formatted;
}
function validRequest(value2, epoch) {
  return DIGEST4.test(value2.keyDigest) && DIGEST4.test("valueDigest" in value2 ? value2.valueDigest : value2.holderDigest) && value2.epoch === epoch && Number.isSafeInteger(value2.expiresAtMs);
}
function object(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function beforeDeadline(promise, signal) {
  if (signal.aborted) return Promise.reject(new ApplyCoordinationError("YKP-COORD-002"));
  return new Promise((resolve3, reject) => {
    const aborted = () => reject(new ApplyCoordinationError("YKP-COORD-002"));
    signal.addEventListener("abort", aborted, { once: true });
    promise.then((value2) => {
      signal.removeEventListener("abort", aborted);
      resolve3(value2);
    }, (error) => {
      signal.removeEventListener("abort", aborted);
      reject(error);
    });
  });
}
async function bounded4(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw new ApplyCoordinationError("YKP-COORD-001");
  const chunks = [];
  let length = 0;
  try {
    for (; ; ) {
      const { done, value: value2 } = await beforeDeadline(reader.read(), signal);
      if (done) break;
      if (!(value2 instanceof Uint8Array) || (length += value2.byteLength) > MAX_BODY) {
        await reader.cancel();
        throw new ApplyCoordinationError("YKP-COORD-001");
      }
      chunks.push(value2);
    }
  } catch (error) {
    if (error instanceof ApplyCoordinationError) throw error;
    throw new ApplyCoordinationError("YKP-COORD-002");
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text5;
  try {
    text5 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ApplyCoordinationError("YKP-COORD-001");
  }
  let parsed;
  try {
    parsed = JSON.parse(text5);
  } catch {
    throw new ApplyCoordinationError("YKP-COORD-001");
  }
  if (canonical(parsed) !== text5) throw new ApplyCoordinationError("YKP-COORD-001");
  return parsed;
}
function createApplyCoordinationHttpStore(options) {
  let base;
  try {
    base = new URL(options?.baseUri);
  } catch {
    throw new TypeError("invalid coordination configuration");
  }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/" || options.baseUri.endsWith("/") || !Number.isSafeInteger(options.epoch) || options.epoch < 1 || !Number.isSafeInteger(options.deadlineMs) || options.deadlineMs < 1 || options.deadlineMs > 5e3 || typeof options.authenticate !== "function") throw new TypeError("invalid coordination configuration");
  const fetcher = options.fetch ?? globalThis.fetch;
  async function call(path, body) {
    const target = `${options.baseUri}${path}`, raw2 = canonical(body);
    if (Buffer.byteLength(raw2) > MAX_BODY) throw new ApplyCoordinationError("YKP-COORD-001");
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), options.deadlineMs);
    try {
      let auth;
      try {
        auth = await beforeDeadline(options.authenticate({ method: "POST", targetUri: target, signal: controller.signal }), controller.signal);
      } catch {
        throw new ApplyCoordinationError("YKP-COORD-002");
      }
      if (typeof auth?.credential !== "string" || auth.credential.length < 1 || auth.credential.length > 8192 || typeof auth.proof !== "string" || auth.proof.length < 1 || auth.proof.length > 16384) throw new ApplyCoordinationError("YKP-COORD-001");
      let response;
      try {
        response = await fetcher(target, { method: "POST", redirect: "manual", signal: controller.signal, headers: { authorization: `DPoP ${auth.credential}`, dpop: auth.proof, "content-type": MEDIA }, body: raw2 });
      } catch {
        throw new ApplyCoordinationError("YKP-COORD-002");
      }
      if (response.status >= 300 && response.status < 400) throw new ApplyCoordinationError("YKP-COORD-002");
      if (response.headers.get("content-type")?.split(";").map((part) => part.trim()).join(";") !== MEDIA) throw new ApplyCoordinationError("YKP-COORD-001");
      const parsed = await bounded4(response, controller.signal);
      if (!object(parsed)) throw new ApplyCoordinationError("YKP-COORD-001");
      if (!response.ok) {
        if (response.status === 401) throw new ApplyCoordinationError("YKP-COORD-004");
        if (response.status === 403) throw new ApplyCoordinationError("YKP-COORD-005");
        const code = parsed.code;
        throw new ApplyCoordinationError(code === "conflict" || code === "replayed" || code === "stale_fence" ? "YKP-COORD-003" : code === "temporarily_unavailable" ? "YKP-COORD-002" : "YKP-COORD-001");
      }
      if (parsed.specversion !== "1" || typeof parsed.outcome !== "string") throw new ApplyCoordinationError("YKP-COORD-001");
      return parsed;
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    consumeNonce: async (request) => {
      if (!validRequest(request, options.epoch)) throw new ApplyCoordinationError("YKP-COORD-001");
      const result2 = await call("/coordination-primitives/v1/nonces:consume", { epoch: request.epoch, expires_at: expiry(request.expiresAtMs), scope_digest: request.keyDigest, value_digest: request.valueDigest });
      if (result2.outcome !== "consumed" && result2.outcome !== "replayed") throw new ApplyCoordinationError("YKP-COORD-001");
      return result2.outcome;
    },
    acquireLease: async (request) => {
      if (!validRequest(request, options.epoch)) throw new ApplyCoordinationError("YKP-COORD-001");
      let result2;
      try {
        result2 = await call("/coordination-primitives/v1/leases:acquire", { epoch: request.epoch, expires_at: expiry(request.expiresAtMs), holder_digest: request.holderDigest, scope_digest: request.keyDigest });
      } catch (error) {
        if (error instanceof ApplyCoordinationError && error.code === "YKP-COORD-003") return null;
        throw error;
      }
      if (result2.outcome !== "acquired" || typeof result2.lease_capability !== "string" || result2.lease_capability.length < 1 || result2.lease_capability.length > MAX_CAPABILITY || !Number.isSafeInteger(result2.fencing_token) || Number(result2.fencing_token) < 1) throw new ApplyCoordinationError("YKP-COORD-001");
      let capability = result2.lease_capability, fencingToken = Number(result2.fencing_token);
      const lease = { get fencingToken() {
        return fencingToken;
      }, renew: async (expiresAtMs) => {
        try {
          const renewed = await call("/coordination-primitives/v1/leases:renew", { expires_at: expiry(expiresAtMs), lease_capability: capability });
          if (renewed.outcome !== "renewed" || typeof renewed.lease_capability !== "string" || renewed.lease_capability.length < 1 || renewed.lease_capability.length > MAX_CAPABILITY || !Number.isSafeInteger(renewed.fencing_token) || Number(renewed.fencing_token) <= fencingToken) throw new ApplyCoordinationError("YKP-COORD-001");
          capability = renewed.lease_capability;
          fencingToken = Number(renewed.fencing_token);
          return true;
        } catch (error) {
          if (error instanceof ApplyCoordinationError && error.code === "YKP-COORD-003") return false;
          throw error;
        }
      }, valid: async () => {
        const inspected = await call("/coordination-primitives/v1/leases:inspect", { lease_capability: capability });
        if (!["valid", "expired", "released", "stale"].includes(String(inspected.outcome))) throw new ApplyCoordinationError("YKP-COORD-001");
        return inspected.outcome === "valid";
      }, release: async () => {
        try {
          const released = await call("/coordination-primitives/v1/leases:release", { lease_capability: capability });
          return released.outcome === "released";
        } catch (error) {
          if (error instanceof ApplyCoordinationError && error.code === "YKP-COORD-003") return false;
          throw error;
        }
      } };
      return lease;
    }
  };
}

// src/issue-contract.ts
var import_yaml = __toESM(require_dist(), 1);
var MESSAGES2 = {
  "YKP-CONTRACT-001": "required field is missing",
  "YKP-CONTRACT-002": "contract envelope is ambiguous or incomplete",
  "YKP-CONTRACT-003": "input byte limit is exceeded",
  "YKP-CONTRACT-004": "YAML syntax or feature is forbidden",
  "YKP-CONTRACT-005": "structural limit is exceeded",
  "YKP-CONTRACT-006": "field is not recognized",
  "YKP-CONTRACT-007": "value has an invalid type",
  "YKP-CONTRACT-008": "value is invalid or unsupported",
  "YKP-CONTRACT-009": "sequence value is duplicated",
  "YKP-CONTRACT-010": "relationship is invalid",
  "YKP-CONTRACT-011": "date range is inconsistent"
};
var OPEN = "<!-- yukh:issue:v1";
var WORK_TYPES = /* @__PURE__ */ new Set(["epic", "gate", "feature", "task", "bug", "technical-debt"]);
var ROOT_FIELDS = /* @__PURE__ */ new Set(["schema", "work_type", "area", "priority", "size", "estimate", "iteration", "project", "relationships"]);
var PROJECT_FIELDS = /* @__PURE__ */ new Set(["status", "start_date", "target_date"]);
var RELATIONSHIP_FIELDS = /* @__PURE__ */ new Set(["parent", "blocks", "blocked_by"]);
function add2(target, code, path, offset = Number.MAX_SAFE_INTEGER) {
  target.push({ code, path, severity: "error", message: MESSAGES2[code], offset });
}
function finish(contract, source) {
  const seen = /* @__PURE__ */ new Set();
  const diagnostics2 = source.sort((a, b) => a.offset - b.offset || a.code.localeCompare(b.code) || a.path.localeCompare(b.path)).filter((item) => {
    const key = `${item.code}\0${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ offset: _offset, ...item }) => item);
  return { contract: diagnostics2.length === 0 ? contract : null, diagnostics: diagnostics2 };
}
function exactLineOffsets(body, line) {
  const result2 = [];
  let offset = 0;
  for (const part of body.split(/(?<=\n)/u)) {
    const value2 = part.replace(/\r?\n$/u, "");
    if (value2 === line) result2.push(offset);
    offset += part.length;
  }
  return result2;
}
function inspectStructure(node, depth, path, diagnostics2, state) {
  const value2 = node;
  const offset = value2?.range?.[0] ?? Number.MAX_SAFE_INTEGER;
  if (depth > 8) add2(diagnostics2, "YKP-CONTRACT-005", path, offset);
  if ((0, import_yaml.isAlias)(node) || value2?.anchor || value2?.tag) {
    add2(diagnostics2, "YKP-CONTRACT-004", path, offset);
    return;
  }
  if ((0, import_yaml.isMap)(node)) {
    const limit = depth === 0 ? 32 : 16;
    if (node.items.length > limit) add2(diagnostics2, "YKP-CONTRACT-005", path, offset);
    for (const pair of node.items) {
      if (!(0, import_yaml.isScalar)(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") {
        add2(diagnostics2, "YKP-CONTRACT-004", path, pair.key?.range?.[0] ?? offset);
        continue;
      }
      inspectStructure(pair.value, depth + 1, `${path}.${pair.key.value}`, diagnostics2, state);
    }
    return;
  }
  if ((0, import_yaml.isSeq)(node)) {
    if (node.items.length > 100) add2(diagnostics2, "YKP-CONTRACT-005", path, offset);
    node.items.forEach((item, index) => inspectStructure(item, depth + 1, `${path}[${index}]`, diagnostics2, state));
    return;
  }
  if ((0, import_yaml.isScalar)(node)) {
    state.scalars += 1;
    if (state.scalars > 512) add2(diagnostics2, "YKP-CONTRACT-005", path, offset);
    if (typeof node.value === "string" && [...node.value].length > 512) add2(diagnostics2, "YKP-CONTRACT-005", path, offset);
  }
}
function isRecord(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function vocabulary(value2, max, path, diagnostics2) {
  if (typeof value2 !== "string") {
    add2(diagnostics2, "YKP-CONTRACT-007", path);
    return void 0;
  }
  const normalized = value2.trim();
  if (!normalized || [...normalized].length > max || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    add2(diagnostics2, "YKP-CONTRACT-008", path);
    return void 0;
  }
  return normalized;
}
function calendarDate(value2, path, diagnostics2) {
  if (typeof value2 !== "string") {
    add2(diagnostics2, "YKP-CONTRACT-007", path);
    return void 0;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value2)) {
    add2(diagnostics2, "YKP-CONTRACT-008", path);
    return void 0;
  }
  const [year, month, day] = value2.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    add2(diagnostics2, "YKP-CONTRACT-008", path);
    return void 0;
  }
  return value2;
}
function issueNumber(value2, path, diagnostics2) {
  if (!Number.isSafeInteger(value2) || value2 <= 0) {
    add2(diagnostics2, typeof value2 === "number" ? "YKP-CONTRACT-008" : "YKP-CONTRACT-007", path);
    return void 0;
  }
  return value2;
}
function relationList(value2, path, current, diagnostics2) {
  if (!Array.isArray(value2)) {
    add2(diagnostics2, "YKP-CONTRACT-007", path);
    return void 0;
  }
  if (value2.length > 100) {
    add2(diagnostics2, "YKP-CONTRACT-005", path);
    return void 0;
  }
  const result2 = [];
  const seen = /* @__PURE__ */ new Set();
  value2.forEach((entry, index) => {
    const parsed = issueNumber(entry, `${path}[${index}]`, diagnostics2);
    if (parsed === void 0) return;
    if (seen.has(parsed)) add2(diagnostics2, "YKP-CONTRACT-009", `${path}[${index}]`);
    else if (current !== void 0 && parsed === current) add2(diagnostics2, "YKP-CONTRACT-010", `${path}[${index}]`);
    else {
      seen.add(parsed);
      result2.push(parsed);
    }
  });
  return result2;
}
function unknownFields(value2, allowed, path, diagnostics2) {
  for (const field2 of Object.keys(value2)) if (!allowed.has(field2)) add2(diagnostics2, "YKP-CONTRACT-006", `${path}.${field2}`);
}
function semantic(value2, options, diagnostics2) {
  if (!isRecord(value2)) {
    add2(diagnostics2, "YKP-CONTRACT-007", "$");
    return null;
  }
  unknownFields(value2, ROOT_FIELDS, "$", diagnostics2);
  for (const field2 of ["schema", "work_type", "area"]) if (!(field2 in value2)) add2(diagnostics2, "YKP-CONTRACT-001", `$.${field2}`);
  const result2 = {};
  if ("schema" in value2) {
    if (value2.schema === 1) result2.schema = 1;
    else add2(diagnostics2, typeof value2.schema === "number" ? "YKP-CONTRACT-008" : "YKP-CONTRACT-007", "$.schema");
  }
  if ("work_type" in value2) {
    if (typeof value2.work_type !== "string") add2(diagnostics2, "YKP-CONTRACT-007", "$.work_type");
    else if (!WORK_TYPES.has(value2.work_type)) add2(diagnostics2, "YKP-CONTRACT-008", "$.work_type");
    else result2.work_type = value2.work_type;
  }
  if ("area" in value2) result2.area = vocabulary(value2.area, 64, "$.area", diagnostics2);
  if ("priority" in value2) result2.priority = vocabulary(value2.priority, 32, "$.priority", diagnostics2);
  if ("size" in value2) result2.size = vocabulary(value2.size, 32, "$.size", diagnostics2);
  if ("iteration" in value2) result2.iteration = vocabulary(value2.iteration, 128, "$.iteration", diagnostics2);
  if ("estimate" in value2) {
    if (typeof value2.estimate !== "number") add2(diagnostics2, "YKP-CONTRACT-007", "$.estimate");
    else if (!Number.isFinite(value2.estimate) || value2.estimate < 0 || value2.estimate > 1e4) add2(diagnostics2, "YKP-CONTRACT-008", "$.estimate");
    else result2.estimate = value2.estimate;
  }
  if ("project" in value2) {
    if (!isRecord(value2.project)) add2(diagnostics2, "YKP-CONTRACT-007", "$.project");
    else {
      unknownFields(value2.project, PROJECT_FIELDS, "$.project", diagnostics2);
      const project = {};
      if ("status" in value2.project) project.status = vocabulary(value2.project.status, 64, "$.project.status", diagnostics2);
      if ("start_date" in value2.project) project.start_date = calendarDate(value2.project.start_date, "$.project.start_date", diagnostics2);
      if ("target_date" in value2.project) project.target_date = calendarDate(value2.project.target_date, "$.project.target_date", diagnostics2);
      if (project.start_date && project.target_date && project.target_date < project.start_date) add2(diagnostics2, "YKP-CONTRACT-011", "$.project.target_date");
      result2.project = project;
    }
  }
  if ("relationships" in value2) {
    if (!isRecord(value2.relationships)) add2(diagnostics2, "YKP-CONTRACT-007", "$.relationships");
    else {
      unknownFields(value2.relationships, RELATIONSHIP_FIELDS, "$.relationships", diagnostics2);
      const relationships = {};
      if ("parent" in value2.relationships) {
        const parent = issueNumber(value2.relationships.parent, "$.relationships.parent", diagnostics2);
        if (parent !== void 0 && options.issueNumber === parent) add2(diagnostics2, "YKP-CONTRACT-010", "$.relationships.parent");
        else if (parent !== void 0) relationships.parent = parent;
      }
      if ("blocks" in value2.relationships) relationships.blocks = relationList(value2.relationships.blocks, "$.relationships.blocks", options.issueNumber, diagnostics2);
      if ("blocked_by" in value2.relationships) relationships.blocked_by = relationList(value2.relationships.blocked_by, "$.relationships.blocked_by", options.issueNumber, diagnostics2);
      result2.relationships = relationships;
    }
  }
  return result2;
}
function parseIssueContract(body, options = {}) {
  const diagnostics2 = [];
  if (Buffer.byteLength(body, "utf8") > 256 * 1024) {
    add2(diagnostics2, "YKP-CONTRACT-003", "$", 0);
    return finish(null, diagnostics2);
  }
  const openings = exactLineOffsets(body, OPEN);
  if (openings.length === 0) return finish(null, diagnostics2);
  if (openings.length !== 1) {
    add2(diagnostics2, "YKP-CONTRACT-002", "$", openings[1] ?? openings[0]);
    return finish(null, diagnostics2);
  }
  const start = openings[0];
  const contentStart = body.indexOf("\n", start);
  if (contentStart < 0) {
    add2(diagnostics2, "YKP-CONTRACT-002", "$", start);
    return finish(null, diagnostics2);
  }
  const closing = exactLineOffsets(body.slice(contentStart + 1), "-->").map((offset) => offset + contentStart + 1);
  if (closing.length === 0) {
    add2(diagnostics2, "YKP-CONTRACT-002", "$", start);
    return finish(null, diagnostics2);
  }
  const end = closing[0];
  const content = body.slice(contentStart + 1, end);
  if (Buffer.byteLength(content, "utf8") > 16 * 1024) {
    add2(diagnostics2, "YKP-CONTRACT-003", "$", start);
    return finish(null, diagnostics2);
  }
  const documents = (0, import_yaml.parseAllDocuments)(content, { schema: "core", uniqueKeys: true, strict: true, prettyErrors: false });
  if (documents.length !== 1 || documents.some((document2) => document2.errors.length > 0)) {
    add2(diagnostics2, "YKP-CONTRACT-004", "$", start);
    return finish(null, diagnostics2);
  }
  const document = documents[0];
  inspectStructure(document.contents, 0, "$", diagnostics2, { scalars: 0 });
  if (diagnostics2.length > 0) return finish(null, diagnostics2);
  let value2;
  try {
    value2 = document.toJS({ maxAliasCount: 0, mapAsMap: false });
  } catch {
    add2(diagnostics2, "YKP-CONTRACT-004", "$", start);
    return finish(null, diagnostics2);
  }
  const contract = semantic(value2, options, diagnostics2);
  return finish(contract, diagnostics2);
}

// src/github-readonly.ts
import { createHash as createHash5 } from "node:crypto";
var READ_OPERATIONS = ["resolve_scope", "read_project_fields", "read_project_item", "read_issue_relationships"];
var MSG = { "YKP-GH-READ-001": "requested scope is invalid", "YKP-GH-READ-002": "authentication failed", "YKP-GH-READ-003": "access is denied", "YKP-GH-READ-004": "provider is unavailable", "YKP-GH-READ-005": "response limit is exceeded", "YKP-GH-READ-006": "resource binding does not match", "YKP-GH-READ-007": "pagination invariant is invalid", "YKP-GH-READ-008": "provider response is invalid", "YKP-GH-READ-009": "provider rate limit is reached", "YKP-GH-READ-010": "failure could not be safely classified", "YKP-GH-READ-011": "required provider capability is unavailable", "YKP-RATE-001": "provider budget is reserved", "YKP-CACHE-001": "cached observation is invalid", "YKP-CAPABILITY-001": "required provider capability is unavailable", "YKP-REST-001": "REST response is invalid", "YKP-SNAPSHOT-001": "snapshot is incomplete" };
function failure2(code, operation, retry = "never") {
  return { observation: null, diagnostics: [{ code, severity: "error", message: MSG[code], operation, retry }] };
}
function rec(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function text(v, max = 256) {
  return typeof v === "string" && v.trim() === v && [...v].length > 0 && [...v].length <= max && !/[\u0000-\u001f\u007f]/u.test(v);
}
function scopeOK(s) {
  return !!s && text(s.ownerLogin) && text(s.repositoryName) && Number.isSafeInteger(s.projectNumber) && s.projectNumber > 0 && Number.isSafeInteger(s.issueNumber) && s.issueNumber > 0;
}
function page(v) {
  return rec(v) && Array.isArray(v.nodes) && rec(v.pageInfo) && typeof v.pageInfo.hasNextPage === "boolean" && (v.pageInfo.endCursor === null || text(v.pageInfo.endCursor));
}
var ReadFailure = class {
  constructor(code, operation) {
    this.code = code;
    this.operation = operation;
  }
  code;
  operation;
};
async function readGitHubObservation(scope, transport) {
  if (!scopeOK(scope)) return failure2("YKP-GH-READ-001", "scope");
  const counts = Object.fromEntries(READ_OPERATIONS.map((k) => [k, 0]));
  let bytes = 0, pages = 0;
  const execute = async (op, cursor) => {
    counts[op]++;
    const e = await transport.execute(op, Object.freeze({ ownerLogin: scope.ownerLogin, repositoryName: scope.repositoryName, projectNumber: scope.projectNumber, issueNumber: scope.issueNumber, cursor, first: 50 }));
    pages++;
    if (!Number.isSafeInteger(e?.byteCount) || e.byteCount < 0 || e.byteCount > 2 * 1024 * 1024 || (bytes += e.byteCount) > 16 * 1024 * 1024) throw new ReadFailure("YKP-GH-READ-005", op);
    if (!rec(e.data)) throw new ReadFailure("YKP-GH-READ-008", op);
    return e.data;
  };
  try {
    const resolved = await execute("resolve_scope", null);
    if (resolved.ownerLogin !== scope.ownerLogin || resolved.repositoryName !== scope.repositoryName || resolved.projectNumber !== scope.projectNumber || resolved.issueNumber !== scope.issueNumber || !text(resolved.subjectRef) || !text(resolved.repositoryRef) || !text(resolved.projectRef) || !text(resolved.issueRef)) throw new ReadFailure("YKP-GH-READ-006", "resolve_scope");
    if (typeof resolved.issueBody !== "string") throw new ReadFailure("YKP-GH-READ-008", "resolve_scope");
    if (Buffer.byteLength(resolved.issueBody, "utf8") > 256 * 1024) throw new ReadFailure("YKP-GH-READ-005", "resolve_scope");
    const paginate = async (op) => {
      const out = [];
      const cursors = /* @__PURE__ */ new Set();
      let cursor = null;
      for (let n = 0; n < 20; n++) {
        const data = await execute(op, cursor);
        if (!page(data)) throw new ReadFailure("YKP-GH-READ-008", op);
        out.push(data);
        if (!data.pageInfo.hasNextPage) return out;
        const next = data.pageInfo.endCursor;
        if (!next || cursors.has(next) || next === cursor) throw new ReadFailure("YKP-GH-READ-007", op);
        cursors.add(next);
        cursor = next;
      }
      throw new ReadFailure("YKP-GH-READ-005", op);
    };
    const fieldPages = await paginate("read_project_fields"), itemPages = await paginate("read_project_item"), relationPages = await paginate("read_issue_relationships");
    const fields = [];
    const fieldIds = /* @__PURE__ */ new Set(), optionIds = /* @__PURE__ */ new Set();
    let optionCount = 0;
    for (const p of fieldPages) {
      if (p.projectRef !== resolved.projectRef) throw new ReadFailure("YKP-GH-READ-006", "read_project_fields");
      for (const v of p.nodes) {
        if (!rec(v) || !text(v.id) || !text(v.name) || !["text", "number", "date", "single_select", "iteration"].includes(String(v.kind)) || fieldIds.has(v.id) || !Array.isArray(v.options) || v.options.length > 256) throw new ReadFailure("YKP-GH-READ-008", "read_project_fields");
        fieldIds.add(v.id);
        const options = [];
        for (const o of v.options) {
          if (!rec(o) || !text(o.id) || !text(o.name) || optionIds.has(o.id)) throw new ReadFailure("YKP-GH-READ-008", "read_project_fields");
          optionIds.add(o.id);
          options.push({ id: o.id, name: o.name });
          if (++optionCount > 2048) throw new ReadFailure("YKP-GH-READ-005", "read_project_fields");
        }
        options.sort((a, b) => a.id.localeCompare(b.id));
        fields.push({ id: v.id, name: v.name, kind: v.kind, options });
        if (fields.length > 256) throw new ReadFailure("YKP-GH-READ-005", "read_project_fields");
      }
    }
    let item = null;
    const values = {};
    let itemRef, fingerprint;
    for (const p of itemPages) {
      if (p.issueRef !== resolved.issueRef) throw new ReadFailure("YKP-GH-READ-006", "read_project_item");
      if (p.absent === true) {
        if (p.nodes.length || itemRef) throw new ReadFailure("YKP-GH-READ-008", "read_project_item");
        continue;
      }
      if (p.projectRef !== resolved.projectRef || !text(p.itemRef) || !text(p.fingerprint) || itemRef && p.itemRef !== itemRef || fingerprint && p.fingerprint !== fingerprint) throw new ReadFailure("YKP-GH-READ-006", "read_project_item");
      itemRef = p.itemRef;
      fingerprint = p.fingerprint;
      for (const v of p.nodes) {
        if (!rec(v) || !text(v.key, 64) || v.key in values || !(v.value === null || typeof v.value === "string" || typeof v.value === "number" && Number.isFinite(v.value))) throw new ReadFailure("YKP-GH-READ-008", "read_project_item");
        values[v.key] = v.value;
        if (Object.keys(values).length > 256) throw new ReadFailure("YKP-GH-READ-005", "read_project_item");
      }
    }
    if (itemRef && fingerprint) item = { values, fingerprint };
    const nodes = /* @__PURE__ */ new Set(), parents = [], blocks = [];
    const edges = /* @__PURE__ */ new Set();
    for (const p of relationPages) {
      if (p.repositoryRef !== resolved.repositoryRef || p.issueRef !== resolved.issueRef) throw new ReadFailure("YKP-GH-READ-006", "read_issue_relationships");
      for (const v of p.nodes) {
        if (!rec(v) || !Number.isSafeInteger(v.issueNumber) || v.issueNumber <= 0 || nodes.has(v.issueNumber)) throw new ReadFailure("YKP-GH-READ-008", "read_issue_relationships");
        nodes.add(v.issueNumber);
        if (nodes.size > 512) throw new ReadFailure("YKP-GH-READ-005", "read_issue_relationships");
      }
      for (const [key, target, limit] of [["parent", parents, 511], ["blocks", blocks, 4096]]) {
        const list2 = p[key];
        if (!Array.isArray(list2)) throw new ReadFailure("YKP-GH-READ-008", "read_issue_relationships");
        for (const e of list2) {
          if (!rec(e) || !Number.isSafeInteger(e.from) || !Number.isSafeInteger(e.to)) throw new ReadFailure("YKP-GH-READ-008", "read_issue_relationships");
          const id2 = `${key}:${e.from}->${e.to}`;
          if (edges.has(id2)) throw new ReadFailure("YKP-GH-READ-008", "read_issue_relationships");
          edges.add(id2);
          target.push({ from: e.from, to: e.to });
          if (target.length > limit) throw new ReadFailure("YKP-GH-READ-005", "read_issue_relationships");
        }
      }
    }
    if (!nodes.has(scope.issueNumber) || [...parents, ...blocks].some((e) => !nodes.has(e.from) || !nodes.has(e.to) || e.from === e.to)) throw new ReadFailure("YKP-GH-READ-006", "read_issue_relationships");
    fields.sort((a, b) => a.id.localeCompare(b.id));
    const relationships = { nodes: [...nodes].sort((a, b) => a - b), parent: parents.sort((a, b) => a.from - b.from || a.to - b.to), blocks: blocks.sort((a, b) => a.from - b.from || a.to - b.to) };
    const base = { scope: { subjectRef: resolved.subjectRef, repositoryRef: resolved.repositoryRef, projectRef: resolved.projectRef, issueRef: resolved.issueRef, issueNumber: scope.issueNumber }, projectSchema: { fields }, item, relationships };
    const fingerprintOut = createHash5("sha256").update(canonicalJson(base)).digest("hex");
    return { observation: { ...base, issueBody: resolved.issueBody, evidence: { schema: 1, operationCounts: counts, pageCount: pages, fingerprint: fingerprintOut } }, diagnostics: [] };
  } catch (e) {
    if (e instanceof ReadFailure) return failure2(e.code, e.operation, e.code === "YKP-GH-READ-008" ? "review" : "never");
    if (rec(e) && typeof e.code === "string" && Object.hasOwn(MSG, e.code)) {
      const code = e.code;
      return failure2(code, "scope", code === "YKP-GH-READ-004" ? "full-read" : code === "YKP-GH-READ-009" || code === "YKP-RATE-001" ? "reset" : code === "YKP-GH-READ-008" || code === "YKP-REST-001" || code === "YKP-SNAPSHOT-001" ? "review" : "never");
    }
    return failure2("YKP-GH-READ-004", "scope", "full-read");
  }
}

// src/policy.ts
var import_yaml2 = __toESM(require_dist(), 1);
var MESSAGES3 = {
  "YKP-POLICY-001": "required policy field is missing",
  "YKP-POLICY-002": "YAML syntax or feature is forbidden",
  "YKP-POLICY-003": "policy resource limit is exceeded",
  "YKP-POLICY-004": "policy field is not recognized",
  "YKP-POLICY-005": "policy value has an invalid type",
  "YKP-POLICY-006": "policy value is invalid",
  "YKP-POLICY-007": "policy display name is duplicated or ambiguous",
  "YKP-SCHEMA-001": "observed schema boundary is invalid",
  "YKP-SCHEMA-002": "observed field or option is ambiguous",
  "YKP-SCHEMA-003": "required observed field is missing",
  "YKP-SCHEMA-004": "observed field kind conflicts with policy",
  "YKP-SCHEMA-005": "policy name collides with observed state"
};
var LOGICAL_KEY = /^[a-z][a-z0-9_]{0,63}$/u;
var KINDS = /* @__PURE__ */ new Set(["text", "number", "date", "single_select", "iteration"]);
var MODES = /* @__PURE__ */ new Set(["managed", "observed"]);
var ROOT_FIELDS2 = /* @__PURE__ */ new Set(["schema", "fields"]);
var FIELD_FIELDS = /* @__PURE__ */ new Set(["name", "kind", "mode", "options"]);
function add3(target, code, path, offset = Number.MAX_SAFE_INTEGER) {
  target.push({ code, path, severity: "error", message: MESSAGES3[code], offset });
}
function finalize(source) {
  const seen = /* @__PURE__ */ new Set();
  return source.sort((a, b) => a.offset - b.offset || a.code.localeCompare(b.code) || a.path.localeCompare(b.path)).filter((item) => {
    const key = `${item.code}\0${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ offset: _offset, ...item }) => item);
}
function isRecord2(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function comparisonFold(value2) {
  return value2.normalize("NFKC").toLocaleLowerCase("en-US");
}
function displayName(value2, path, diagnostics2) {
  if (typeof value2 !== "string") {
    add3(diagnostics2, "YKP-POLICY-005", path);
    return void 0;
  }
  const normalized = value2.trim();
  if (!normalized || [...normalized].length > 128 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    add3(diagnostics2, "YKP-POLICY-006", path);
    return void 0;
  }
  return normalized;
}
function inspectYaml(node, depth, path, diagnostics2, state) {
  const value2 = node;
  const offset = value2?.range?.[0] ?? Number.MAX_SAFE_INTEGER;
  if (depth > 8) add3(diagnostics2, "YKP-POLICY-003", path, offset);
  if ((0, import_yaml2.isAlias)(node) || value2?.anchor || value2?.tag) {
    add3(diagnostics2, "YKP-POLICY-002", path, offset);
    return;
  }
  if ((0, import_yaml2.isMap)(node)) {
    for (const pair of node.items) {
      if (!(0, import_yaml2.isScalar)(pair.key) || typeof pair.key.value !== "string" || pair.key.value === "<<") {
        add3(diagnostics2, "YKP-POLICY-002", path, offset);
        continue;
      }
      inspectYaml(pair.value, depth + 1, `${path}.${pair.key.value}`, diagnostics2, state);
    }
    return;
  }
  if ((0, import_yaml2.isSeq)(node)) {
    add3(diagnostics2, "YKP-POLICY-005", path, offset);
    return;
  }
  if ((0, import_yaml2.isScalar)(node)) {
    state.scalars += 1;
    if (state.scalars > 2048) add3(diagnostics2, "YKP-POLICY-003", path, offset);
    if (typeof node.value === "string" && [...node.value].length > 512) add3(diagnostics2, "YKP-POLICY-003", path, offset);
  }
}
function unknownFields2(value2, allowed, path, diagnostics2) {
  for (const key of Object.keys(value2)) if (!allowed.has(key)) add3(diagnostics2, "YKP-POLICY-004", `${path}.${key}`);
}
function parseRepositoryPolicy(source) {
  const internal = [];
  if (Buffer.byteLength(source, "utf8") > 64 * 1024) {
    add3(internal, "YKP-POLICY-003", "$", 0);
    return { policy: null, diagnostics: finalize(internal) };
  }
  const documents = (0, import_yaml2.parseAllDocuments)(source, { schema: "core", uniqueKeys: true, strict: true, prettyErrors: false });
  if (documents.length !== 1 || documents.some((document2) => document2.errors.length > 0)) {
    add3(internal, "YKP-POLICY-002", "$", 0);
    return { policy: null, diagnostics: finalize(internal) };
  }
  const document = documents[0];
  inspectYaml(document.contents, 0, "$", internal, { scalars: 0 });
  if (internal.length > 0) return { policy: null, diagnostics: finalize(internal) };
  let raw2;
  try {
    raw2 = document.toJS({ maxAliasCount: 0, mapAsMap: false });
  } catch {
    add3(internal, "YKP-POLICY-002", "$", 0);
    return { policy: null, diagnostics: finalize(internal) };
  }
  if (!isRecord2(raw2)) {
    add3(internal, "YKP-POLICY-005", "$");
    return { policy: null, diagnostics: finalize(internal) };
  }
  unknownFields2(raw2, ROOT_FIELDS2, "$", internal);
  for (const required of ["schema", "fields"]) if (!(required in raw2)) add3(internal, "YKP-POLICY-001", `$.${required}`);
  if ("schema" in raw2 && raw2.schema !== 1) add3(internal, typeof raw2.schema === "number" ? "YKP-POLICY-006" : "YKP-POLICY-005", "$.schema");
  const fields = {};
  const names = /* @__PURE__ */ new Map();
  if ("fields" in raw2) {
    if (!isRecord2(raw2.fields)) add3(internal, "YKP-POLICY-005", "$.fields");
    else if (Object.keys(raw2.fields).length < 1 || Object.keys(raw2.fields).length > 64) add3(internal, "YKP-POLICY-003", "$.fields");
    else for (const key of Object.keys(raw2.fields).sort()) {
      const path = `$.fields.${key}`;
      if (!LOGICAL_KEY.test(key)) add3(internal, "YKP-POLICY-006", path);
      const declaration = raw2.fields[key];
      if (!isRecord2(declaration)) {
        add3(internal, "YKP-POLICY-005", path);
        continue;
      }
      unknownFields2(declaration, FIELD_FIELDS, path, internal);
      for (const required of ["name", "kind", "mode"]) if (!(required in declaration)) add3(internal, "YKP-POLICY-001", `${path}.${required}`);
      const name = "name" in declaration ? displayName(declaration.name, `${path}.name`, internal) : void 0;
      const kind2 = declaration.kind;
      const mode = declaration.mode;
      if ("kind" in declaration && (typeof kind2 !== "string" || !KINDS.has(kind2))) add3(internal, typeof kind2 === "string" ? "YKP-POLICY-006" : "YKP-POLICY-005", `${path}.kind`);
      if ("mode" in declaration && (typeof mode !== "string" || !MODES.has(mode))) add3(internal, typeof mode === "string" ? "YKP-POLICY-006" : "YKP-POLICY-005", `${path}.mode`);
      const options = {};
      if ("options" in declaration) {
        if (kind2 !== "single_select" || mode !== "managed") add3(internal, "YKP-POLICY-006", `${path}.options`);
        else if (!isRecord2(declaration.options)) add3(internal, "YKP-POLICY-005", `${path}.options`);
        else if (Object.keys(declaration.options).length < 1 || Object.keys(declaration.options).length > 128) add3(internal, "YKP-POLICY-003", `${path}.options`);
        else {
          const optionNames = /* @__PURE__ */ new Map();
          for (const optionKey of Object.keys(declaration.options).sort()) {
            const optionPath = `${path}.options.${optionKey}`;
            if (!LOGICAL_KEY.test(optionKey)) add3(internal, "YKP-POLICY-006", optionPath);
            const optionName = displayName(declaration.options[optionKey], optionPath, internal);
            if (optionName) {
              const folded = comparisonFold(optionName);
              if (optionNames.has(folded)) add3(internal, "YKP-POLICY-007", optionPath);
              else {
                optionNames.set(folded, optionKey);
                options[optionKey] = optionName;
              }
            }
          }
        }
      } else if (kind2 === "single_select" && mode === "managed") add3(internal, "YKP-POLICY-001", `${path}.options`);
      if (name) {
        const folded = comparisonFold(name);
        if (names.has(folded)) add3(internal, "YKP-POLICY-007", `${path}.name`);
        else names.set(folded, key);
      }
      if (name && KINDS.has(kind2) && MODES.has(mode) && LOGICAL_KEY.test(key)) {
        fields[key] = { name, kind: kind2, mode, ...Object.keys(options).length ? { options } : {} };
      }
    }
  }
  const diagnostics2 = finalize(internal);
  return { policy: diagnostics2.length === 0 ? { schema: 1, fields } : null, diagnostics: diagnostics2 };
}
function boundedOpaque(value2) {
  return typeof value2 === "string" && [...value2].length > 0 && [...value2].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function validateObserved(schema, diagnostics2) {
  if (!schema || !Array.isArray(schema.fields) || schema.fields.length > 256) {
    add3(diagnostics2, "YKP-SCHEMA-001", "$.observed.fields");
    return;
  }
  const ids = /* @__PURE__ */ new Set();
  const names = /* @__PURE__ */ new Map();
  let totalOptions = 0;
  schema.fields.forEach((field2, index) => {
    const path = `$.observed.fields[${index}]`;
    if (!field2 || !boundedOpaque(field2.providerId) || !boundedOpaque(field2.name) || !KINDS.has(field2.kind)) {
      add3(diagnostics2, "YKP-SCHEMA-001", path);
      return;
    }
    if (ids.has(field2.providerId)) add3(diagnostics2, "YKP-SCHEMA-002", `${path}.providerId`);
    else ids.add(field2.providerId);
    const folded = comparisonFold(field2.name);
    if (names.has(folded)) add3(diagnostics2, "YKP-SCHEMA-002", `${path}.name`);
    else names.set(folded, path);
    const options = field2.options ?? [];
    if (!Array.isArray(options) || options.length > 256 || field2.kind !== "single_select" && options.length > 0) {
      add3(diagnostics2, "YKP-SCHEMA-001", `${path}.options`);
      return;
    }
    totalOptions += options.length;
    const optionNames = /* @__PURE__ */ new Map();
    options.forEach((option2, optionIndex) => {
      const optionPath = `${path}.options[${optionIndex}]`;
      if (!option2 || !boundedOpaque(option2.providerId) || !boundedOpaque(option2.name)) {
        add3(diagnostics2, "YKP-SCHEMA-001", optionPath);
        return;
      }
      if (ids.has(option2.providerId)) add3(diagnostics2, "YKP-SCHEMA-002", `${optionPath}.providerId`);
      else ids.add(option2.providerId);
      const optionFold = comparisonFold(option2.name);
      if (optionNames.has(optionFold)) add3(diagnostics2, "YKP-SCHEMA-002", `${optionPath}.name`);
      else optionNames.set(optionFold, optionPath);
    });
  });
  if (totalOptions > 2048) add3(diagnostics2, "YKP-SCHEMA-001", "$.observed.fields");
}
var OPERATION_RANK = { create_field: 0, preserve_field: 1, add_option: 2, preserve_option: 3 };
function calculateEffectiveSchema(policy, observed) {
  const internal = [];
  validateObserved(observed, internal);
  if (internal.length > 0) return { executable: false, diagnostics: finalize(internal), observations: [], operations: [] };
  const operations = [];
  const managedNames = /* @__PURE__ */ new Set();
  for (const fieldKey of Object.keys(policy.fields).sort()) {
    const desired = policy.fields[fieldKey];
    managedNames.add(desired.name);
    const exact5 = observed.fields.filter((field2) => field2.name === desired.name);
    const folded = observed.fields.filter((field2) => comparisonFold(field2.name) === comparisonFold(desired.name));
    const path = `$.fields.${fieldKey}`;
    if (exact5.length === 0) {
      if (folded.length > 0) add3(internal, "YKP-SCHEMA-005", `${path}.name`);
      else if (desired.mode === "observed") add3(internal, "YKP-SCHEMA-003", path);
      else operations.push({ type: "create_field", fieldKey, name: desired.name, kind: desired.kind, options: Object.entries(desired.options ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([optionKey, name]) => ({ optionKey, name })) });
      continue;
    }
    const current = exact5[0];
    if (current.kind !== desired.kind) {
      add3(internal, "YKP-SCHEMA-004", `${path}.kind`);
      continue;
    }
    operations.push({ type: "preserve_field", fieldKey, fieldProviderId: current.providerId, name: current.name, kind: current.kind });
    if (desired.mode !== "managed" || desired.kind !== "single_select") continue;
    for (const [optionKey, optionName] of Object.entries(desired.options ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const optionPath = `${path}.options.${optionKey}`;
      const exactOption = (current.options ?? []).find((option2) => option2.name === optionName);
      const foldedOption = (current.options ?? []).find((option2) => comparisonFold(option2.name) === comparisonFold(optionName));
      if (exactOption) operations.push({ type: "preserve_option", fieldKey, fieldProviderId: current.providerId, optionKey, optionProviderId: exactOption.providerId, name: exactOption.name });
      else if (foldedOption) add3(internal, "YKP-SCHEMA-005", optionPath);
      else operations.push({ type: "add_option", fieldKey, fieldProviderId: current.providerId, optionKey, name: optionName });
    }
  }
  const observations = observed.fields.filter((field2) => !managedNames.has(field2.name)).map((field2) => ({ type: "preserve_unmanaged_field", name: field2.name })).sort((a, b) => a.name.localeCompare(b.name));
  operations.sort((a, b) => a.fieldKey.localeCompare(b.fieldKey) || OPERATION_RANK[a.type] - OPERATION_RANK[b.type] || ("optionKey" in a ? a.optionKey : "").localeCompare("optionKey" in b ? b.optionKey : ""));
  const diagnostics2 = finalize(internal);
  return { executable: diagnostics2.length === 0, diagnostics: diagnostics2, observations, operations };
}

// src/dry-run.ts
var MESSAGE2 = "dry-run could not produce a complete report";
function fail(failureClass, codes) {
  return { status: "error", failureClass, diagnostics: codes.slice(0, 64).map((code) => ({ code, message: MESSAGE2 })) };
}
function readClass(code) {
  return code === "YKP-GH-READ-002" ? "authentication" : code === "YKP-GH-READ-003" ? "authorization" : code === "YKP-RATE-001" ? "deferred" : code === "YKP-REST-001" || code === "YKP-SNAPSHOT-001" || code === "YKP-CACHE-001" ? "invariant" : "provider";
}
async function prepareReconciliation(input2) {
  const policy = parseRepositoryPolicy(input2.policySource);
  if (!policy.policy) return fail("input", policy.diagnostics.map((d) => d.code));
  const read = await readGitHubObservation(input2.scope, input2.transport);
  if (!read.observation) return fail(readClass(read.diagnostics[0]?.code ?? ""), read.diagnostics.map((d) => d.code));
  const contract = parseIssueContract(read.observation.issueBody, { issueNumber: input2.scope.issueNumber });
  if (!contract.contract) return fail("input", contract.diagnostics.length ? contract.diagnostics.map((d) => d.code) : ["YKP-RUNTIME-001"]);
  const observed = { fields: read.observation.projectSchema.fields.map((field2) => ({ providerId: field2.id, name: field2.name, kind: field2.kind, options: field2.options.map((option2) => ({ providerId: option2.id, name: option2.name })) })) };
  const schema = calculateEffectiveSchema(policy.policy, observed);
  if (!schema.executable) return fail("invariant", schema.diagnostics.map((d) => d.code));
  if (!read.observation.item) return fail("invariant", ["YKP-RUNTIME-002"]);
  const values = {};
  for (const [logical, declaration] of Object.entries(policy.policy.fields)) {
    if (Object.hasOwn(read.observation.item.values, declaration.name)) values[logical] = read.observation.item.values[declaration.name];
  }
  const item = { values, fingerprint: read.observation.item.fingerprint };
  const plan = planReconciliation({ scope: read.observation.scope, contract: contract.contract, policy: policy.policy, schema, observedItem: item, relationships: read.observation.relationships });
  return { status: "success", plan, observation: read.observation, policy: policy.policy, schema };
}

// src/github-mutation-transport.ts
var API = "https://api.github.com";
var ENDPOINT = `${API}/graphql`;
var REST_VERSION = "2026-03-10";
var GITHUB_MUTATION_DOCUMENTS = Object.freeze({
  update_project_field_options: `mutation YukhUpdateProjectFieldOptions($input:UpdateProjectV2FieldInput!){updateProjectV2Field(input:$input){clientMutationId projectV2Field{id}}}`,
  update_project_item_field_value: `mutation YukhUpdateProjectItemFieldValue($input:UpdateProjectV2ItemFieldValueInput!){updateProjectV2ItemFieldValue(input:$input){clientMutationId projectV2Item{id}}}`,
  add_sub_issue: `mutation YukhAddSubIssue($input:AddSubIssueInput!){addSubIssue(input:$input){clientMutationId issue{id} subIssue{id}}}`,
  add_blocked_by: `mutation YukhAddBlockedBy($input:AddBlockedByInput!){addBlockedBy(input:$input){clientMutationId issue{id} blockingIssue{id}}}`
});
var GITHUB_MUTATION_ESTIMATED_COSTS = Object.freeze({ update_project_field_options: 100, update_project_item_field_value: 100, add_sub_issue: 100, add_blocked_by: 100 });
var GitHubMutationTransportError = class extends Error {
  constructor(code) {
    super("GitHub mutation transport failed");
    this.code = code;
    this.name = "GitHubMutationTransportError";
  }
  code;
};
function rec2(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function text2(v, max = 256) {
  return typeof v === "string" && [...v].length > 0 && [...v].length <= max && !/[\u0000-\u001f\u007f]/u.test(v);
}
function keys(v, expected) {
  return Object.keys(v).sort().join("\0") === [...expected].sort().join("\0");
}
function id(v) {
  return text2(v, 256);
}
function positive(v) {
  return Number.isSafeInteger(v) && v > 0;
}
function owner(v) {
  return typeof v === "string" && /^[A-Za-z0-9-]{1,39}$/u.test(v);
}
function repository(v) {
  return typeof v === "string" && /^[A-Za-z0-9_.-]{1,100}$/u.test(v);
}
function option(v, withId) {
  if (!rec2(v)) return false;
  const expected = withId ? ["id", "name", "color", "description"] : ["name", "color", "description"];
  return keys(v, expected) && (!withId || id(v.id)) && text2(v.name, 128) && ["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"].includes(String(v.color)) && typeof v.description === "string" && [...v.description].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(v.description);
}
function raw(v, max = 128) {
  if (typeof v === "string" && [...v].length <= max && !/[\u0000-\u001f\u007f]/u.test(v)) return v;
  if (rec2(v) && typeof v.raw === "string" && [...v.raw].length <= max && !/[\u0000-\u001f\u007f]/u.test(v.raw)) return v.raw;
  return void 0;
}
function permissionsExact(kind2, p, approvedKinds) {
  const allowed = /* @__PURE__ */ new Set(["create_project_field", "update_project_field_options", "update_project_item_field_value", "set_issue_type", "add_sub_issue", "add_blocked_by"]), kinds = new Set(approvedKinds);
  if (kinds.size !== approvedKinds.length || kinds.size < 1 || [...kinds].some((value2) => !allowed.has(value2)) || !kinds.has(kind2)) return false;
  const needsProjects = [...kinds].some((value2) => value2 === "create_project_field" || value2 === "update_project_field_options" || value2 === "update_project_item_field_value"), needsIssues = [...kinds].some((value2) => value2 === "set_issue_type" || value2 === "add_sub_issue" || value2 === "add_blocked_by"), approved = new Set(p.approvedExtraPermissions ?? []);
  return p.projects === (needsProjects ? "write" : "none") && p.issues === (needsIssues ? "write" : "none") && p.extraPermissions.length === approved.size && p.extraPermissions.every((value2) => approved.has(value2));
}
function input(kind2, v, clientMutationId) {
  if (!rec2(v) || v.kind !== kind2 || !/^[a-f0-9]{64}$/u.test(clientMutationId)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
  if (kind2 === "create_project_field" && v.kind === kind2) {
    if (!keys(v, ["kind", "ownerKind", "ownerLogin", "projectNumber", "dataType", "name", ...v.options === void 0 ? [] : ["options"]]) || !["orgs", "users"].includes(v.ownerKind) || !owner(v.ownerLogin) || !positive(v.projectNumber) || !text2(v.name, 128) || !["TEXT", "SINGLE_SELECT", "NUMBER", "DATE"].includes(v.dataType) || v.dataType === "SINGLE_SELECT" !== Array.isArray(v.options) || v.options?.length === 0 || v.options && (!v.options.every((x) => option(x, false)) || v.options.length > 256)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { ownerKind: v.ownerKind, ownerLogin: v.ownerLogin, projectNumber: v.projectNumber, dataType: v.dataType, name: v.name, ...v.options ? { options: v.options } : {} }, expected: {} };
  }
  if (kind2 === "update_project_field_options" && v.kind === kind2) {
    if (!keys(v, ["kind", "fieldId", "observedOptions", "newOption"]) || !id(v.fieldId) || !Array.isArray(v.observedOptions) || v.observedOptions.length >= 256 || !v.observedOptions.every((x) => option(x, true)) || new Set(v.observedOptions.map((x) => x.id)).size !== v.observedOptions.length || !option(v.newOption, false) || v.newOption.color !== "GRAY" || v.newOption.description !== "" || v.observedOptions.some((x) => x.name === v.newOption.name)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { fieldId: v.fieldId, singleSelectOptions: [...v.observedOptions, v.newOption], clientMutationId }, expected: { projectV2Field: v.fieldId } };
  }
  if (kind2 === "update_project_item_field_value" && v.kind === kind2) {
    if (!keys(v, ["kind", "projectId", "itemId", "fieldId", "value"]) || !id(v.projectId) || !id(v.itemId) || !id(v.fieldId) || !rec2(v.value) || Object.keys(v.value).length !== 1) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    const valueRecord = v.value, [k] = Object.keys(valueRecord), x = valueRecord[k];
    if (!(["text", "date", "singleSelectOptionId", "iterationId"].includes(k) && text2(x, 512) || k === "number" && typeof x === "number" && Number.isFinite(x))) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { projectId: v.projectId, itemId: v.itemId, fieldId: v.fieldId, value: v.value, clientMutationId }, expected: { projectV2Item: v.itemId } };
  }
  if (kind2 === "set_issue_type" && v.kind === kind2) {
    if (!keys(v, ["kind", "ownerLogin", "repositoryName", "issueNumber", "issueTypeName"]) || !owner(v.ownerLogin) || !repository(v.repositoryName) || !positive(v.issueNumber) || !text2(v.issueTypeName, 128)) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { ownerLogin: v.ownerLogin, repositoryName: v.repositoryName, issueNumber: v.issueNumber, issueTypeName: v.issueTypeName }, expected: {} };
  }
  if (kind2 === "add_sub_issue" && v.kind === kind2) {
    if (!keys(v, ["kind", "parentIssueId", "subIssueId"]) || !id(v.parentIssueId) || !id(v.subIssueId) || v.parentIssueId === v.subIssueId) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { issueId: v.parentIssueId, subIssueId: v.subIssueId, replaceParent: false, clientMutationId }, expected: { issue: v.parentIssueId, subIssue: v.subIssueId } };
  }
  if (kind2 === "add_blocked_by" && v.kind === kind2) {
    if (!keys(v, ["kind", "blockedIssueId", "blockingIssueId"]) || !id(v.blockedIssueId) || !id(v.blockingIssueId) || v.blockedIssueId === v.blockingIssueId) throw new GitHubMutationTransportError("YKP-GH-WRITE-001");
    return { input: { issueId: v.blockedIssueId, blockingIssueId: v.blockingIssueId, clientMutationId }, expected: { issue: v.blockedIssueId, blockingIssue: v.blockingIssueId } };
  }
  throw new GitHubMutationTransportError("YKP-GH-WRITE-002");
}
function createGitHubMutationTransport(options) {
  if (!text2(options?.token, 4096) || !Array.isArray(options.approvedKinds)) throw new TypeError("invalid credential");
  const fetcher = options.fetch ?? globalThis.fetch;
  return { execute: async (kind2, variables2, clientMutationId) => {
    if (!permissionsExact(kind2, options.permissions, options.approvedKinds)) throw new GitHubMutationTransportError("YKP-GH-WRITE-003");
    const mapped = input(kind2, variables2, clientMutationId), rest = kind2 === "create_project_field" || kind2 === "set_issue_type", graphqlKind = kind2;
    if (options.rateLedger && !options.rateLedger.reserve(rest ? "rest" : "graphql", rest ? 1 : GITHUB_MUTATION_ESTIMATED_COSTS[graphqlKind])) throw new GitHubMutationTransportError("YKP-GH-WRITE-008");
    let response;
    try {
      if (kind2 === "create_project_field") {
        const value2 = mapped.input;
        response = await fetcher(`${API}/${value2.ownerKind}/${value2.ownerLogin}/projectsV2/${value2.projectNumber}/fields`, { method: "POST", redirect: "manual", headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: `Bearer ${options.token}`, "x-github-api-version": REST_VERSION }, body: JSON.stringify({ name: value2.name, data_type: String(value2.dataType).toLowerCase(), ...Array.isArray(value2.options) ? { single_select_options: value2.options } : {} }) });
      } else if (kind2 === "set_issue_type") {
        const value2 = mapped.input;
        response = await fetcher(`${API}/repos/${value2.ownerLogin}/${value2.repositoryName}/issues/${value2.issueNumber}`, { method: "PATCH", redirect: "manual", headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: `Bearer ${options.token}`, "x-github-api-version": REST_VERSION }, body: JSON.stringify({ type: value2.issueTypeName }) });
      } else {
        response = await fetcher(ENDPOINT, { method: "POST", redirect: "manual", headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: `Bearer ${options.token}`, "x-github-api-version": "2022-11-28" }, body: JSON.stringify({ query: GITHUB_MUTATION_DOCUMENTS[graphqlKind], variables: { input: mapped.input } }) });
      }
    } catch {
      throw new GitHubMutationTransportError("YKP-GH-WRITE-004");
    }
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (options.rateLedger && remaining !== null && /^\d+$/u.test(remaining)) options.rateLedger.observe(rest ? "rest" : "graphql", Number(remaining));
    if (response.status >= 300 && response.status < 400) throw new GitHubMutationTransportError("YKP-GH-WRITE-005");
    if (response.status === 401) throw new GitHubMutationTransportError("YKP-GH-WRITE-006");
    if (response.status === 403) throw new GitHubMutationTransportError(response.headers.get("x-ratelimit-remaining") === "0" ? "YKP-GH-WRITE-008" : "YKP-GH-WRITE-007");
    if (response.status === 429) throw new GitHubMutationTransportError("YKP-GH-WRITE-008");
    if ([502, 503, 504].includes(response.status)) throw new GitHubMutationTransportError("YKP-GH-WRITE-004");
    const expectedRestStatus = kind2 === "create_project_field" ? 201 : kind2 === "set_issue_type" ? 200 : void 0;
    if (!response.ok || expectedRestStatus !== void 0 && response.status !== expectedRestStatus || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new GitHubMutationTransportError(response.status === 422 ? "YKP-GH-WRITE-011" : "YKP-GH-WRITE-009");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) throw new GitHubMutationTransportError("YKP-GH-WRITE-010");
    let body;
    try {
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      throw new GitHubMutationTransportError("YKP-GH-WRITE-009");
    }
    if (kind2 === "create_project_field") {
      const value2 = mapped.input;
      if (!rec2(body) || !id(body.node_id) || body.name !== value2.name || body.data_type !== String(value2.dataType).toLowerCase()) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
      if (Array.isArray(value2.options)) {
        if (!Array.isArray(body.options) || body.options.length !== value2.options.length) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
        for (let index = 0; index < value2.options.length; index++) {
          const expected = value2.options[index], observed = body.options[index];
          if (!rec2(expected) || !rec2(observed) || raw(observed.name) !== expected.name || observed.color !== expected.color || raw(observed.description, 256) !== expected.description) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
        }
      }
      return { kind: kind2, clientMutationId, providerAccepted: true };
    }
    if (kind2 === "set_issue_type") {
      const value2 = mapped.input;
      if (!rec2(body) || body.number !== value2.issueNumber || !rec2(body.type) || body.type.name !== value2.issueTypeName) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
      return { kind: kind2, clientMutationId, providerAccepted: true };
    }
    if (!rec2(body) || Array.isArray(body.errors) || !rec2(body.data)) throw new GitHubMutationTransportError("YKP-GH-WRITE-011");
    const field2 = { update_project_field_options: "updateProjectV2Field", update_project_item_field_value: "updateProjectV2ItemFieldValue", add_sub_issue: "addSubIssue", add_blocked_by: "addBlockedBy" }[graphqlKind];
    const payload = body.data[field2];
    if (!rec2(payload) || payload.clientMutationId !== clientMutationId) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
    for (const [name, expected] of Object.entries(mapped.expected)) {
      const node = payload[name];
      if (!rec2(node) || node.id !== expected) throw new GitHubMutationTransportError("YKP-GH-WRITE-012");
    }
    return { kind: kind2, clientMutationId, providerAccepted: true };
  } };
}

// src/github-transport.ts
var DOCUMENTS = {
  resolve_scope: `query YukhResolveScope($ownerLogin:String!,$repositoryName:String!,$projectNumber:Int!,$issueNumber:Int!){viewer{login}repository(owner:$ownerLogin,name:$repositoryName){id issue(number:$issueNumber){id number body projectItems(first:100){nodes{id project{id number}}pageInfo{hasNextPage}}}}repositoryOwner(login:$ownerLogin){... on User{projectV2(number:$projectNumber){id number}}... on Organization{projectV2(number:$projectNumber){id number}}}}`,
  read_project_fields: `query YukhReadProjectFields($ownerLogin:String!,$projectNumber:Int!,$first:Int!,$cursor:String){repositoryOwner(login:$ownerLogin){... on User{projectV2(number:$projectNumber){id fields(first:$first,after:$cursor){nodes{... on ProjectV2Field{id name dataType}... on ProjectV2SingleSelectField{id name dataType options{id name}}... on ProjectV2IterationField{id name dataType configuration{iterations{id title}completedIterations{id title}}}}pageInfo{hasNextPage endCursor}}}}... on Organization{projectV2(number:$projectNumber){id fields(first:$first,after:$cursor){nodes{... on ProjectV2Field{id name dataType}... on ProjectV2SingleSelectField{id name dataType options{id name}}... on ProjectV2IterationField{id name dataType configuration{iterations{id title}completedIterations{id title}}}}pageInfo{hasNextPage endCursor}}}}}}`,
  read_project_item: `query YukhReadProjectItem($ownerLogin:String!,$repositoryName:String!,$issueNumber:Int!,$first:Int!,$cursor:String){repository(owner:$ownerLogin,name:$repositoryName){issue(number:$issueNumber){id projectItems(first:100){nodes{id project{id number}fieldValues(first:$first,after:$cursor){nodes{... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldNumberValue{number field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldDateValue{date field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2FieldCommon{name}}}... on ProjectV2ItemFieldIterationValue{title field{... on ProjectV2FieldCommon{name}}}}pageInfo{hasNextPage endCursor}}}pageInfo{hasNextPage}}}}}`,
  read_issue_relationships: `query YukhReadIssueRelationships($ownerLogin:String!,$repositoryName:String!,$issueNumber:Int!,$first:Int!,$cursor:String){repository(owner:$ownerLogin,name:$repositoryName){id issue(number:$issueNumber){id number parent{number repository{id}}subIssues(first:$first,after:$cursor){nodes{number repository{id}}pageInfo{hasNextPage endCursor}}blockedBy(first:$first,after:$cursor){nodes{number repository{id}}pageInfo{hasNextPage endCursor}}blocking(first:$first,after:$cursor){nodes{number repository{id}}pageInfo{hasNextPage endCursor}}}}}`
};
var GITHUB_READ_QUERY_DOCUMENTS = Object.freeze({ ...DOCUMENTS });
var GitHubTransportError = class extends Error {
  constructor(code) {
    super("GitHub read transport failed");
    this.code = code;
    this.name = "GitHubTransportError";
  }
  code;
};

// src/github-apply-failure.ts
function normalizeGitHubApplyFailure(error) {
  if (error instanceof ApplyPortError) return error;
  if (error instanceof GitHubMutationTransportError) {
    if (error.code === "YKP-GH-WRITE-006") return new ApplyPortError("authentication");
    if (error.code === "YKP-GH-WRITE-007" || error.code === "YKP-GH-WRITE-003") return new ApplyPortError("authorization");
    if (error.code === "YKP-GH-WRITE-008") return new ApplyPortError("deferred_rate_budget");
    if (["YKP-GH-WRITE-004", "YKP-GH-WRITE-005", "YKP-GH-WRITE-009", "YKP-GH-WRITE-010", "YKP-GH-WRITE-011"].includes(error.code)) return new ApplyPortError("provider");
    return new ApplyPortError("invariant");
  }
  if (error instanceof GitHubTransportError) {
    if (error.code === "YKP-GH-READ-002") return new ApplyPortError("authentication");
    if (error.code === "YKP-GH-READ-003" || error.code === "YKP-CAPABILITY-001") return new ApplyPortError("authorization");
    if (error.code === "YKP-RATE-001" || error.code === "YKP-GH-READ-009") return new ApplyPortError("deferred_rate_budget");
    if (error.code === "YKP-GH-READ-004") return new ApplyPortError("provider");
    return new ApplyPortError("invariant");
  }
  return new ApplyPortError("invariant");
}

// src/github-rate-ledger.ts
function finiteNonnegative(value2) {
  return Number.isFinite(value2) && Number.isSafeInteger(value2) && value2 >= 0;
}
function createGitHubRateLedger(options = {}) {
  const restReserve = options.restReserve ?? 500, graphqlReserve = options.graphqlReserve ?? 500, maxRestRequests = options.maxRestRequests ?? 32, maxGraphqlRequests = options.maxGraphqlRequests ?? 1, maxGraphqlPoints = options.maxGraphqlPoints ?? 100;
  if (![restReserve, graphqlReserve, maxRestRequests, maxGraphqlRequests, maxGraphqlPoints].every(finiteNonnegative) || restReserve < 500 || graphqlReserve < 500 || maxRestRequests > 64 || maxGraphqlRequests > 2 || maxGraphqlPoints > 500) throw new TypeError("invalid rate ledger options");
  let restRemaining = options.restRemaining ?? Number.POSITIVE_INFINITY, graphqlRemaining = options.graphqlRemaining ?? Number.POSITIVE_INFINITY, restRequests = 0, graphqlRequests = 0, graphqlPoints = 0, deferredResource = null;
  if (!(finiteNonnegative(restRemaining) || restRemaining === Number.POSITIVE_INFINITY) || !(finiteNonnegative(graphqlRemaining) || graphqlRemaining === Number.POSITIVE_INFINITY)) throw new TypeError("invalid provider rate state");
  return {
    reserve: (resource, cost = 1) => {
      if (!finiteNonnegative(cost) || cost < 1) return false;
      if (resource === "rest") {
        if (restRequests >= maxRestRequests || restRemaining - cost < restReserve) {
          deferredResource = "rest";
          return false;
        }
        restRequests++;
        if (Number.isFinite(restRemaining)) restRemaining -= cost;
        return true;
      }
      if (resource !== "graphql") return false;
      if (graphqlRequests >= maxGraphqlRequests || graphqlPoints + cost > maxGraphqlPoints || graphqlRemaining - cost < graphqlReserve) {
        deferredResource = "graphql";
        return false;
      }
      graphqlRequests++;
      graphqlPoints += cost;
      if (Number.isFinite(graphqlRemaining)) graphqlRemaining -= cost;
      return true;
    },
    observe: (resource, remaining) => {
      if (!finiteNonnegative(remaining)) return;
      if (resource === "rest") restRemaining = Math.min(restRemaining, remaining);
      else if (resource === "graphql") graphqlRemaining = Math.min(graphqlRemaining, remaining);
    },
    snapshot: () => ({ restRequests, graphqlRequests, graphqlPoints, restRemaining, graphqlRemaining, deferredResource })
  };
}

// src/github-rest-snapshot.ts
import { createHash as createHash6 } from "node:crypto";
var API2 = "https://api.github.com";
var GRAPHQL = `${API2}/graphql`;
var API_VERSION = "2026-03-10";
var RELATIONSHIP_QUERY = `query YukhRelationshipSnapshot($ids:[ID!]!){nodes(ids:$ids){... on Issue{id number repository{id} parent{number repository{id}} subIssues(first:100){nodes{number repository{id}}pageInfo{hasNextPage}} blockedBy(first:100){nodes{number repository{id}}pageInfo{hasNextPage}} blocking(first:100){nodes{number repository{id}}pageInfo{hasNextPage}}}} rateLimit{cost remaining resetAt}}`;
var RELATIONSHIP_QUERY_ESTIMATED_COST = 100;
function rec3(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function array(v) {
  if (!Array.isArray(v) || !v.every(rec3)) throw new GitHubTransportError("YKP-REST-001");
  return v;
}
function text3(v, max = 512) {
  if (typeof v !== "string" || v.length === 0 || [...v].length > max || /[\u0000-\u001f\u007f]/u.test(v)) throw new GitHubTransportError("YKP-REST-001");
  return v;
}
function integer(v) {
  if (!Number.isSafeInteger(v) || v <= 0) throw new GitHubTransportError("YKP-REST-001");
  return v;
}
function rawName(v) {
  if (typeof v === "string") return text3(v, 128);
  if (rec3(v) && rec3(v.name) && typeof v.name.raw === "string") return text3(v.name.raw, 128);
  if (rec3(v) && typeof v.raw === "string") return text3(v.raw, 128);
  throw new GitHubTransportError("YKP-REST-001");
}
function value(v) {
  if (v === null) return null;
  if (typeof v === "string" || typeof v === "number" && Number.isFinite(v)) return v;
  if (rec3(v)) {
    if (rec3(v.name) && typeof v.name.raw === "string") return v.name.raw;
    if (typeof v.raw === "string") return v.raw;
  }
  return null;
}
function kind(v) {
  const map = { text: "text", number: "number", date: "date", single_select: "single_select", iteration: "iteration" };
  const out = map[String(v)];
  if (!out) throw new GitHubTransportError("YKP-REST-001");
  return out;
}
function nextLink(value2) {
  if (!value2) return null;
  for (const part of value2.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/u);
    if (match) return match[1] ?? null;
  }
  return null;
}
function normalizedPath(value2) {
  if (value2.startsWith("/")) return value2;
  let parsed;
  try {
    parsed = new URL(value2);
  } catch {
    throw new GitHubTransportError("YKP-CAPABILITY-001");
  }
  if (parsed.origin !== API2 || parsed.username || parsed.password || parsed.hash) throw new GitHubTransportError("YKP-CAPABILITY-001");
  return `${parsed.pathname}${parsed.search}`;
}
function issueNumberFromUrl(v) {
  if (typeof v !== "string") return void 0;
  const match = v.match(/\/issues\/(\d+)$/u);
  return match ? Number(match[1]) : void 0;
}
function relationshipSummary(content) {
  const summary = rec3(content.issue_dependencies_summary) ? content.issue_dependencies_summary : {};
  const blockedBy = Number(summary.total_blocked_by ?? summary.blocked_by ?? 0), blocking = Number(summary.total_blocking ?? summary.blocking ?? 0);
  if (!Number.isSafeInteger(blockedBy) || blockedBy < 0 || !Number.isSafeInteger(blocking) || blocking < 0) throw new GitHubTransportError("YKP-REST-001");
  return { blockedBy, blocking };
}
var RestSnapshotClient = class {
  constructor(options) {
    this.options = options;
    if (typeof options.token !== "string" || !options.token || /[\u0000-\u001f\u007f]/u.test(options.token)) throw new TypeError("invalid credential");
    this.request = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
    this.ttl = options.cacheTtlMs ?? 3e5;
    this.ledger = options.rateLedger ?? createGitHubRateLedger({ graphqlRemaining: options.graphqlRemaining, restReserve: options.restReserve, graphqlReserve: options.graphqlReserve, maxRestRequests: options.maxRestRequests, maxGraphqlRequests: options.maxGraphqlRequests });
  }
  options;
  request;
  now;
  ttl;
  cache = /* @__PURE__ */ new Map();
  flights = /* @__PURE__ */ new Map();
  generations = /* @__PURE__ */ new Map();
  ledger;
  bytes = 0;
  evidence = { restRequests: 0, graphqlRequests: 0, restCacheHits: 0, conditionalRequests: 0, coalescedRequests: 0 };
  headers(etag) {
    return { accept: "application/vnd.github+json", authorization: `Bearer ${this.options.token}`, "x-github-api-version": API_VERSION, ...etag ? { "if-none-match": etag } : {} };
  }
  classify(response) {
    if (response.status === 401) throw new GitHubTransportError("YKP-GH-READ-002");
    if (response.status === 403) throw new GitHubTransportError(response.headers.get("x-ratelimit-remaining") === "0" ? "YKP-RATE-001" : "YKP-GH-READ-003");
    if (response.status === 429) throw new GitHubTransportError("YKP-RATE-001");
    if ([502, 503, 504].includes(response.status)) throw new GitHubTransportError("YKP-GH-READ-004");
    throw new GitHubTransportError("YKP-REST-001");
  }
  updateRate(resource, headers) {
    const value2 = headers.get("x-ratelimit-remaining");
    if (value2 !== null && /^\d+$/u.test(value2)) this.ledger.observe(resource, Number(value2));
  }
  invalidate(input2, effect) {
    const projectOwnerLogin = input2.projectOwnerLogin ?? input2.ownerLogin;
    if (!/^[A-Za-z0-9-]{1,39}$/u.test(projectOwnerLogin) || !Number.isSafeInteger(input2.projectNumber) || input2.projectNumber < 1) throw new GitHubTransportError("YKP-GH-READ-001");
    const prefix = new RegExp(`^/(?:orgs|users)/${projectOwnerLogin}/projectsV2/${input2.projectNumber}/(?:${effect === "schema" ? "fields|items" : "items"})\\?`, `u`), keys2 = /* @__PURE__ */ new Set([...this.cache.keys(), ...this.flights.keys()]);
    for (const key of keys2) if (prefix.test(key)) {
      this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
      this.cache.delete(key);
      this.flights.delete(key);
    }
  }
  async get(path) {
    if (!/^\/(repos|users|orgs)\/[A-Za-z0-9_.\/-]+(?:\?[A-Za-z0-9_.,=&-]+)?$/u.test(path)) throw new GitHubTransportError("YKP-CAPABILITY-001");
    const key = path, cached = this.cache.get(key), current = this.now();
    if (cached && cached.expires > current) {
      this.evidence.restCacheHits++;
      return { body: cached.body, bytes: cached.bytes, headers: new Headers(cached.link ? { link: cached.link } : {}) };
    }
    const existing = this.flights.get(key);
    if (existing) {
      this.evidence.coalescedRequests++;
      return existing;
    }
    const generation = this.generations.get(key) ?? 0, task = (async () => {
      if (!this.ledger.reserve("rest")) throw new GitHubTransportError("YKP-RATE-001");
      this.evidence.restRequests++;
      if (cached?.etag) this.evidence.conditionalRequests++;
      let response;
      try {
        response = await this.request(`${API2}${path}`, { method: "GET", redirect: "manual", headers: this.headers(cached?.etag) });
      } catch {
        throw new GitHubTransportError("YKP-GH-READ-004");
      }
      this.updateRate("rest", response.headers);
      if (response.status === 304 && cached) {
        const refreshed = { ...cached, expires: current + this.ttl };
        if ((this.generations.get(key) ?? 0) === generation) this.cache.set(key, refreshed);
        return { body: refreshed.body, bytes: 0, headers: new Headers(refreshed.link ? { link: refreshed.link } : {}) };
      }
      if (response.status >= 300 && response.status < 400 || !response.ok) this.classify(response);
      if (!response.headers.get("content-type")?.toLowerCase().includes("json")) throw new GitHubTransportError("YKP-REST-001");
      const raw2 = new Uint8Array(await response.arrayBuffer());
      this.bytes += raw2.byteLength;
      if (raw2.byteLength > 8 * 1024 * 1024 || this.bytes > 64 * 1024 * 1024) throw new GitHubTransportError("YKP-GH-READ-005");
      let body;
      try {
        body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw2));
      } catch {
        throw new GitHubTransportError("YKP-REST-001");
      }
      if ((this.generations.get(key) ?? 0) === generation) this.cache.set(key, { body, bytes: raw2.byteLength, etag: response.headers.get("etag") ?? void 0, link: response.headers.get("link") ?? void 0, expires: current + this.ttl });
      return { body, bytes: raw2.byteLength, headers: response.headers };
    })();
    this.flights.set(key, task);
    try {
      return await task;
    } finally {
      this.flights.delete(key);
    }
  }
  async list(path) {
    const nodes = [];
    let bytes = 0, next = path;
    for (let page2 = 0; next && page2 < 20; page2++) {
      const response = await this.get(normalizedPath(next));
      nodes.push(...array(response.body));
      bytes += response.bytes;
      if (nodes.length > 1e4) throw new GitHubTransportError("YKP-GH-READ-005");
      next = nextLink(response.headers.get("link"));
    }
    if (next) throw new GitHubTransportError("YKP-GH-READ-005");
    return { nodes, bytes };
  }
  async relationships(ids) {
    const result2 = /* @__PURE__ */ new Map();
    if (ids.length === 0) return result2;
    if (ids.length > 100) throw new GitHubTransportError("YKP-GH-READ-005");
    if (this.options.graphqlRemaining === 0 && !this.options.rateLedger) return result2;
    if (!this.ledger.reserve("graphql", RELATIONSHIP_QUERY_ESTIMATED_COST)) throw new GitHubTransportError("YKP-RATE-001");
    this.evidence.graphqlRequests++;
    let response;
    try {
      response = await this.request(GRAPHQL, { method: "POST", redirect: "manual", headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: `Bearer ${this.options.token}`, "x-github-api-version": "2022-11-28" }, body: JSON.stringify({ query: RELATIONSHIP_QUERY, variables: { ids } }) });
    } catch {
      throw new GitHubTransportError("YKP-GH-READ-004");
    }
    this.updateRate("graphql", response.headers);
    if (!response.ok) this.classify(response);
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new GitHubTransportError("YKP-REST-001");
    }
    if (!rec3(payload) || Array.isArray(payload.errors) || !rec3(payload.data) || !Array.isArray(payload.data.nodes) || !rec3(payload.data.rateLimit)) throw new GitHubTransportError("YKP-REST-001");
    this.ledger.observe("graphql", Number(payload.data.rateLimit.remaining));
    for (const node of payload.data.nodes) {
      if (!rec3(node)) throw new GitHubTransportError("YKP-REST-001");
      const connections = ["subIssues", "blockedBy", "blocking"].map((name) => {
        const c = node[name];
        if (!rec3(c) || !Array.isArray(c.nodes) || !rec3(c.pageInfo) || c.pageInfo.hasNextPage === true) throw new GitHubTransportError("YKP-GH-READ-005");
        return c.nodes.map((v) => {
          if (!rec3(v)) throw new GitHubTransportError("YKP-REST-001");
          return integer(v.number);
        });
      });
      result2.set(text3(node.id), { number: integer(node.number), ...rec3(node.parent) ? { parent: integer(node.parent.number) } : {}, blockedBy: connections[1], blocking: connections[2] });
    }
    return result2;
  }
};
function subject(token) {
  return `github-token:${createHash6("sha256").update(token).digest("hex")}`;
}
function fieldOptions(field2) {
  if (!Array.isArray(field2.options)) return [];
  return field2.options.map((option2) => {
    if (!rec3(option2)) throw new GitHubTransportError("YKP-REST-001");
    const colors = ["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"], color = typeof option2.color === "string" && colors.includes(option2.color) ? option2.color : void 0, description = typeof option2.description === "string" && [...option2.description].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(option2.description) ? option2.description : void 0;
    return { id: text3(option2.id), name: rawName(option2.name), ...color ? { color } : {}, ...description !== void 0 ? { description } : {} };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function itemValues(item) {
  const out = {};
  for (const field2 of array(item.fields ?? [])) {
    const name = text3(field2.name, 128);
    if (Object.hasOwn(out, name)) throw new GitHubTransportError("YKP-REST-001");
    out[name] = value(field2.value);
  }
  return out;
}
function nativeIssueFields(content) {
  const out = {};
  if (!Array.isArray(content.issue_field_values)) return out;
  for (const entry of content.issue_field_values) {
    if (!rec3(entry) || typeof entry.issue_field_name !== "string") throw new GitHubTransportError("YKP-REST-001");
    const observed = entry.single_select_option;
    if (rec3(observed) && typeof observed.name === "string") out[entry.issue_field_name] = observed.name;
    else if (typeof entry.value === "string" || typeof entry.value === "number") out[entry.issue_field_name] = entry.value;
  }
  return out;
}
function snapshotInvalidationForMutation(kind2) {
  return kind2 === "create_project_field" || kind2 === "update_project_field_options" ? "schema" : "item";
}
async function readWithClient(input2, options, client) {
  const numbers = [...new Set(input2.issueNumbers)].sort((a, b) => a - b);
  if (!/^[A-Za-z0-9-]{1,39}$/u.test(input2.ownerLogin) || !/^[A-Za-z0-9_.-]{1,100}$/u.test(input2.repositoryName) || !Number.isSafeInteger(input2.projectNumber) || input2.projectNumber < 1 || numbers.length < 1 || numbers.length > 100 || numbers.some((n) => !Number.isSafeInteger(n) || n < 1)) throw new GitHubTransportError("YKP-GH-READ-001");
  const repoPage = await client.get(`/repos/${input2.ownerLogin}/${input2.repositoryName}`), repo = repoPage.body;
  if (!rec3(repo) || !rec3(repo.owner)) throw new GitHubTransportError("YKP-REST-001");
  const repositoryOwnerKind = repo.owner.type === "Organization" ? "orgs" : repo.owner.type === "User" ? "users" : (() => {
    throw new GitHubTransportError("YKP-CAPABILITY-001");
  })();
  const projectOwnerLogin = input2.projectOwnerLogin ?? input2.ownerLogin;
  if (!/^[A-Za-z0-9-]{1,39}$/u.test(projectOwnerLogin)) throw new GitHubTransportError("YKP-GH-READ-001");
  let projectOwnerKind;
  if (projectOwnerLogin === input2.ownerLogin) projectOwnerKind = repositoryOwnerKind;
  else {
    const projectOwner = (await client.get(`/users/${projectOwnerLogin}`)).body;
    if (!rec3(projectOwner)) throw new GitHubTransportError("YKP-REST-001");
    projectOwnerKind = projectOwner.type === "Organization" ? "orgs" : projectOwner.type === "User" ? "users" : (() => {
      throw new GitHubTransportError("YKP-CAPABILITY-001");
    })();
  }
  const projectPage = await client.get(`/${projectOwnerKind}/${projectOwnerLogin}/projectsV2/${input2.projectNumber}`), project = projectPage.body;
  if (!rec3(project) || integer(project.number) !== input2.projectNumber) throw new GitHubTransportError("YKP-SNAPSHOT-001");
  const projectRef = text3(project.node_id);
  const fieldsPage = await client.list(`/${projectOwnerKind}/${projectOwnerLogin}/projectsV2/${input2.projectNumber}/fields?per_page=100`);
  const fields = fieldsPage.nodes.filter((f) => ["text", "number", "date", "single_select", "iteration"].includes(String(f.data_type))).map((f) => ({ id: text3(f.node_id), name: text3(f.name, 128), kind: kind(f.data_type), options: fieldOptions(f) }));
  const fieldSelector = fieldsPage.nodes.map((f) => String(integer(f.id))).join(",");
  if (fieldSelector.length > 4096) throw new GitHubTransportError("YKP-GH-READ-005");
  const itemsPage = await client.list(`/${projectOwnerKind}/${projectOwnerLogin}/projectsV2/${input2.projectNumber}/items?per_page=100${fieldSelector ? `&fields=${fieldSelector}` : ""}`);
  const wanted = new Set(numbers), selected = /* @__PURE__ */ new Map();
  for (const item of itemsPage.nodes) {
    if (!rec3(item.content) || !rec3(item.content.repository) || item.content.repository.full_name !== `${input2.ownerLogin}/${input2.repositoryName}`) continue;
    const n = item.content.number;
    if (Number.isSafeInteger(n) && wanted.has(n)) {
      if (selected.has(n)) throw new GitHubTransportError("YKP-SNAPSHOT-001");
      selected.set(n, item);
    }
  }
  if (selected.size !== numbers.length) throw new GitHubTransportError("YKP-SNAPSHOT-001");
  const relationshipIds = numbers.flatMap((n) => {
    const content = selected.get(n).content, summary = relationshipSummary(content);
    return summary.blockedBy + summary.blocking > 0 ? [text3(content.node_id)] : [];
  });
  const relationships = await client.relationships(relationshipIds), issues = /* @__PURE__ */ new Map();
  for (const n of numbers) {
    const item = selected.get(n), content = item.content, relation = relationships.get(text3(content.node_id));
    const parent = relation?.parent ?? issueNumberFromUrl(content.parent_issue_url), labels = Array.isArray(content.labels) ? content.labels.map((label) => {
      if (!rec3(label)) throw new GitHubTransportError("YKP-REST-001");
      return text3(label.name, 128);
    }).sort() : [], milestone = rec3(content.milestone) && typeof content.milestone.title === "string" ? text3(content.milestone.title, 128) : void 0, issueType = rec3(content.type) && typeof content.type.name === "string" ? text3(content.type.name, 128) : void 0, summary = relationshipSummary(content), relationshipsComplete = Boolean(relation) || summary.blockedBy === 0 && summary.blocking === 0;
    issues.set(n, { issueRef: text3(content.node_id), issueDatabaseId: integer(content.id), body: typeof content.body === "string" ? content.body : "", itemRef: text3(item.node_id), fingerprint: text3(item.node_id), values: itemValues(item), ...issueType ? { issueType } : {}, labels, ...milestone ? { milestone } : {}, issueFields: nativeIssueFields(content), ...parent ? { parent } : {}, blockedBy: relation?.blockedBy ?? [], blocking: relation?.blocking ?? [], relationshipsComplete });
  }
  const issueTypes = options.includeIssueTypes && repositoryOwnerKind === "orgs" ? (await client.list(`/repos/${input2.ownerLogin}/${input2.repositoryName}/issue-types?per_page=100`)).nodes.map((value2) => ({ id: text3(value2.node_id), name: text3(value2.name, 128) })).sort((a, b) => a.id.localeCompare(b.id)) : void 0;
  return { subjectRef: subject(options.token), ownerKind: projectOwnerKind, ownerLogin: input2.ownerLogin, repositoryOwnerKind, projectOwnerKind, projectOwnerLogin, repositoryName: input2.repositoryName, projectNumber: input2.projectNumber, repositoryRef: text3(repo.node_id), projectRef, fields: fields.sort((a, b) => a.id.localeCompare(b.id)), ...issueTypes ? { issueTypes } : {}, issues, evidence: { ...client.evidence } };
}
function createRestProjectSnapshotReader(options) {
  const client = new RestSnapshotClient(options);
  return { read: (input2) => readWithClient(input2, options, client), invalidate: (input2, effect) => client.invalidate(input2, effect) };
}
function createGitHubRestSnapshotReadTransportFromReader(reader) {
  let snapshotPromise;
  let bound;
  return { execute: async (operation, variables2) => {
    const ownerLogin = text3(variables2.ownerLogin), repositoryName = text3(variables2.repositoryName), projectNumber = integer(variables2.projectNumber), issueNumber2 = integer(variables2.issueNumber);
    const projectOwnerLogin = typeof variables2.projectOwnerLogin === "string" ? text3(variables2.projectOwnerLogin) : ownerLogin, key = `${ownerLogin}/${repositoryName}/${projectOwnerLogin}/${projectNumber}/${issueNumber2}`;
    if (bound && bound !== key) throw new GitHubTransportError("YKP-SNAPSHOT-001");
    bound = key;
    snapshotPromise ??= reader.read({ ownerLogin, repositoryName, projectOwnerLogin, projectNumber, issueNumbers: [issueNumber2] });
    const snapshot = await snapshotPromise, issue = snapshot.issues.get(issueNumber2);
    if (!issue) throw new GitHubTransportError("YKP-SNAPSHOT-001");
    let data;
    if (operation === "resolve_scope") data = { subjectRef: snapshot.subjectRef, ownerLogin, repositoryName, projectNumber, issueNumber: issueNumber2, repositoryRef: snapshot.repositoryRef, projectRef: snapshot.projectRef, issueRef: issue.issueRef, issueBody: issue.body };
    else if (operation === "read_project_fields") data = { projectRef: snapshot.projectRef, nodes: snapshot.fields, pageInfo: { hasNextPage: false, endCursor: null } };
    else if (operation === "read_project_item") data = { projectRef: snapshot.projectRef, issueRef: issue.issueRef, itemRef: issue.itemRef, fingerprint: issue.fingerprint, nodes: Object.entries(issue.values).map(([key2, value2]) => ({ key: key2, value: value2 })), pageInfo: { hasNextPage: false, endCursor: null } };
    else {
      const nodes = /* @__PURE__ */ new Set([issueNumber2, ...issue.blockedBy, ...issue.blocking, ...issue.parent ? [issue.parent] : []]);
      data = { repositoryRef: snapshot.repositoryRef, issueRef: issue.issueRef, nodes: [...nodes].sort((a, b) => a - b).map((issueNumber3) => ({ issueNumber: issueNumber3 })), parent: issue.parent ? [{ from: issueNumber2, to: issue.parent }] : [], blocks: [...issue.blockedBy.map((from) => ({ from, to: issueNumber2 })), ...issue.blocking.map((to) => ({ from: issueNumber2, to }))], pageInfo: { hasNextPage: false, endCursor: null } };
    }
    return { byteCount: Buffer.byteLength(JSON.stringify(data)), data };
  } };
}

// src/controlled-apply-host.ts
import { createHash as createHash8 } from "node:crypto";

// src/deferred-receipt.ts
var DIGEST5 = /^[a-f0-9]{64}$/u;
var REASONS = ["rest-reserve", "graphql-reserve", "provider-secondary-limit"];
function record(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function exact(value2, keys2) {
  if (Object.keys(value2).sort().join("\0") !== [...keys2].sort().join("\0")) throw new TypeError("invalid deferred receipt");
}
function integer2(value2) {
  if (!Number.isSafeInteger(value2) || value2 < 0) throw new TypeError("invalid deferred receipt");
  return value2;
}
function digest2(value2) {
  if (typeof value2 !== "string" || !DIGEST5.test(value2)) throw new TypeError("invalid deferred receipt");
  return value2;
}
function parseDeferredReceiptV1(source) {
  if (!record(source)) throw new TypeError("invalid deferred receipt");
  exact(source, ["schema", "version", "status", "reason", "issued_at_ms", "resume_after_ms", "resume_by_ms", "bindings", "ownership", "fresh_approval_required"]);
  if (source.schema !== 1 || source.version !== "deferred-receipt-v1" || source.status !== "deferred" || !REASONS.includes(source.reason) || typeof source.fresh_approval_required !== "boolean") throw new TypeError("invalid deferred receipt");
  const issued = integer2(source.issued_at_ms), after = integer2(source.resume_after_ms), by = integer2(source.resume_by_ms);
  if (after < issued || by < after || by - issued > 24 * 60 * 60 * 1e3) throw new TypeError("invalid deferred receipt");
  if (!record(source.bindings)) throw new TypeError("invalid deferred receipt");
  exact(source.bindings, ["scope_digest", "request_digest", "plan_digest"]);
  const bindings = { scope_digest: digest2(source.bindings.scope_digest), request_digest: digest2(source.bindings.request_digest), plan_digest: source.bindings.plan_digest === null ? null : digest2(source.bindings.plan_digest) };
  if (!record(source.ownership)) throw new TypeError("invalid deferred receipt");
  exact(source.ownership, ["disposition", "mode", "wakeup_digest", "cancellation_digest"]);
  let ownership;
  if (source.ownership.disposition === "retained" && source.ownership.mode === "durable-host") ownership = { disposition: "retained", mode: "durable-host", wakeup_digest: digest2(source.ownership.wakeup_digest), cancellation_digest: digest2(source.ownership.cancellation_digest) };
  else if (source.ownership.disposition === "handoff" && source.ownership.mode === "governed-handoff" && source.ownership.wakeup_digest === null && source.ownership.cancellation_digest === null) ownership = { disposition: "handoff", mode: "governed-handoff", wakeup_digest: null, cancellation_digest: null };
  else throw new TypeError("invalid deferred receipt");
  return { schema: 1, version: "deferred-receipt-v1", status: "deferred", reason: source.reason, issued_at_ms: issued, resume_after_ms: after, resume_by_ms: by, bindings, ownership, fresh_approval_required: source.fresh_approval_required };
}
function createGovernedHandoffReceipt(input2) {
  return parseDeferredReceiptV1({ schema: 1, version: "deferred-receipt-v1", status: "deferred", reason: input2.resource === "rest" ? "rest-reserve" : "graphql-reserve", issued_at_ms: input2.issuedAtMs, resume_after_ms: input2.resumeAfterMs ?? input2.issuedAtMs + 6e4, resume_by_ms: input2.resumeByMs ?? input2.issuedAtMs + 15 * 6e4, bindings: { scope_digest: input2.scopeDigest, request_digest: input2.requestDigest, plan_digest: input2.planDigest }, ownership: { disposition: "handoff", mode: "governed-handoff", wakeup_digest: null, cancellation_digest: null }, fresh_approval_required: input2.freshApprovalRequired });
}

// src/legacy-plan.ts
import { createHash as createHash7 } from "node:crypto";

// src/legacy-shadow.ts
var import_yaml3 = __toESM(require_dist(), 1);
var LEGACY_COMPATIBILITY_MATRIX = Object.freeze([
  { capability: "version-1 repository policy", state: "Supported", note: "parsed as a bounded compatibility input" },
  { capability: "hidden yukh issue contract", state: "Supported", note: "accepted for shadow planning without backlog rewrite" },
  { capability: "issue type and managed labels", state: "Supported", note: "observed through versioned REST and compared locally" },
  { capability: "milestone", state: "Supported", note: "observed through versioned REST and compared locally" },
  { capability: "Project fields", state: "Supported", note: "schema is read once and values are planned locally" },
  { capability: "Project-owned Status", state: "Supported", note: "preserved when absent from repository policy" },
  { capability: "native parent", state: "Supported", note: "read from REST Project item content" },
  { capability: "native dependencies", state: "Changed", note: "one fixed bounded GraphQL batch; GraphQL-zero requires complete cached state or returns deferred" },
  { capability: "single issue shadow dry-run", state: "Supported", note: "REST-first immutable snapshot" },
  { capability: "complete backlog shadow audit", state: "Supported", note: "bounded scopes of at most 100 issues reuse one snapshot reader" },
  { capability: "full apply and zero-operation second apply", state: "Missing", note: "blocked until controlled apply issues are complete" }
]);
function rec4(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function string(value2) {
  return typeof value2 === "string" && value2.trim() && [...value2.trim()].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value2) ? value2.trim() : void 0;
}
function stringMap(value2) {
  const out = {};
  if (!rec4(value2)) return out;
  for (const key of Object.keys(value2).sort()) {
    const parsed = string(value2[key]);
    if (parsed) out[key] = parsed;
  }
  return out;
}
function list(value2) {
  if (value2 === void 0) return [];
  if (!Array.isArray(value2) || value2.length > 100 || value2.some((v) => !Number.isSafeInteger(v) || v < 1)) throw new TypeError("invalid legacy relationship");
  return [...new Set(value2)].sort((a, b) => a - b);
}
function parseYaml(source, maxBytes) {
  if (Buffer.byteLength(source, "utf8") > maxBytes) throw new TypeError("legacy input exceeds bound");
  const documents = (0, import_yaml3.parseAllDocuments)(source, { schema: "core", strict: true, uniqueKeys: true, prettyErrors: false });
  if (documents.length !== 1 || documents[0].errors.length) throw new TypeError("legacy YAML is invalid");
  const value2 = documents[0].toJS({ maxAliasCount: 0, mapAsMap: false });
  if (!rec4(value2)) throw new TypeError("legacy YAML root is invalid");
  return value2;
}
function parseLegacyPolicy(source) {
  const root = parseYaml(source, 64 * 1024);
  if (root.version !== 1 || !rec4(root.fields)) throw new TypeError("legacy policy is invalid");
  const fields = {};
  for (const key of Object.keys(root.fields).sort()) {
    const raw2 = root.fields[key];
    if (!rec4(raw2) || !string(raw2.project_field)) throw new TypeError("legacy policy field is invalid");
    const target = raw2.target === void 0 || raw2.target === "project_field" ? "project_field" : raw2.target === "issue_type" ? "issue_type" : raw2.target === "issue_field" ? "issue_field" : void 0;
    if (!target) throw new TypeError("legacy target is invalid");
    const type = raw2.type === void 0 || raw2.type === "string" ? "string" : raw2.type === "number" ? "number" : raw2.type === "date" ? "date" : void 0;
    if (!type) throw new TypeError("legacy field type is invalid");
    fields[key] = { projectField: string(raw2.project_field), target, required: raw2.required === true, type, values: stringMap(raw2.values), labels: stringMap(raw2.labels) };
  }
  return { fields, milestones: stringMap(root.milestones) };
}
function parseLegacyContract(body) {
  if (Buffer.byteLength(body, "utf8") > 256 * 1024) throw new TypeError("legacy issue body exceeds bound");
  const marker = "<!-- yukh", start = body.indexOf(marker);
  if (start < 0 || body.indexOf(marker, start + marker.length) >= 0) throw new TypeError("legacy issue contract is missing or duplicated");
  const end = body.indexOf("-->", start + marker.length);
  if (end < 0) throw new TypeError("legacy issue contract is unterminated");
  const raw2 = parseYaml(body.slice(start + marker.length, end), 16 * 1024);
  if (raw2.schema !== 1) throw new TypeError("legacy schema is unsupported");
  const kind2 = string(raw2.kind), area = string(raw2.area), priority = string(raw2.priority);
  if (!kind2 || !area || !priority) throw new TypeError("legacy required field is missing");
  const extensions = stringMap(raw2.extensions), size = string(raw2.size), milestone = string(raw2.milestone), estimate = raw2.estimate === void 0 ? void 0 : Number(raw2.estimate), parent = raw2.parent === void 0 ? void 0 : Number(raw2.parent);
  if (estimate !== void 0 && (!Number.isFinite(estimate) || estimate < 0) || parent !== void 0 && (!Number.isSafeInteger(parent) || parent < 1)) throw new TypeError("legacy numeric field is invalid");
  return { kind: kind2, area, priority, ...size ? { size } : {}, ...estimate !== void 0 ? { estimate } : {}, ...milestone ? { milestone } : {}, ...parent !== void 0 ? { parent } : {}, dependsOn: list(raw2.depends_on), blocks: list(raw2.blocks), extensions };
}

// src/work-type-provider.ts
var WorkTypeProviderError = class extends Error {
  constructor(code) {
    super("work type provider failed");
    this.code = code;
    this.name = "WorkTypeProviderError";
  }
  code;
};
function safe(value2, max = 128) {
  return typeof value2 === "string" && value2.length > 0 && [...value2].length <= max && !/[\u0000-\u001f\u007f]/u.test(value2);
}
function selectWorkTypeProvider(input2) {
  if (!input2 || !["users", "orgs"].includes(input2.projectOwnerKind) || !["users", "orgs"].includes(input2.repositoryOwnerKind) || !safe(input2.desired) || !safe(input2.fieldName) || !Array.isArray(input2.fields)) throw new WorkTypeProviderError("YKP-WORKTYPE-001");
  const projectValue = typeof input2.projectValue === "string" ? input2.projectValue : void 0;
  if (input2.nativeValue !== void 0 && projectValue !== void 0 && input2.nativeValue !== projectValue) throw new WorkTypeProviderError("YKP-WORKTYPE-003");
  if (input2.repositoryOwnerKind === "orgs") {
    const matches = (input2.issueTypes ?? []).filter((value2) => value2.name === input2.desired);
    if (matches.length !== 1 || !safe(matches[0]?.id, 256)) throw new WorkTypeProviderError("YKP-WORKTYPE-002");
    return { provider: "native_issue_type", desired: input2.desired, issueTypeId: matches[0].id, converged: input2.nativeValue === input2.desired };
  }
  const fields = input2.fields.filter((value2) => value2.name === input2.fieldName);
  if (fields.length > 1 || fields[0] && fields[0].kind !== "single_select") throw new WorkTypeProviderError("YKP-WORKTYPE-002");
  const field2 = fields[0], options = field2?.options.filter((value2) => value2.name === input2.desired) ?? [];
  if (field2 && options.length !== 1) throw new WorkTypeProviderError("YKP-WORKTYPE-002");
  return { provider: "project_work_type", desired: input2.desired, ...field2 ? { field: field2, optionId: options[0].id } : {}, converged: projectValue === input2.desired };
}

// src/legacy-plan.ts
function digest3(value2) {
  return createHash7("sha256").update(canonicalJson(value2)).digest("hex");
}
function operationKey(...parts) {
  return parts.join(".");
}
function finish2(operations) {
  const base = { schema: 1, executable: true, diagnostics: [], observations: [], operations };
  return { ...base, planId: digest3(base) };
}
function planLegacyReconciliation(policySource, snapshot, issueNumber2) {
  const policy = parseLegacyPolicy(policySource), observed = snapshot.issues.get(issueNumber2);
  if (!observed) throw new TypeError("legacy issue is unavailable");
  const contract = parseLegacyContract(observed.body), scope = { subjectRef: snapshot.subjectRef, repositoryRef: snapshot.repositoryRef, projectRef: snapshot.projectRef, issueRef: observed.issueRef, issueNumber: issueNumber2 }, core = { kind: contract.kind, area: contract.area, priority: contract.priority, size: contract.size, estimate: contract.estimate }, operations = [];
  for (const key of Object.keys(policy.fields).sort()) {
    const declaration = policy.fields[key], logical = core[key] ?? contract.extensions[key];
    if (logical === void 0) continue;
    const desired = typeof logical === "string" && Object.keys(declaration.values).length ? declaration.values[logical] : logical;
    if (desired === void 0) throw new TypeError("legacy value is unsupported");
    if (declaration.target === "issue_field") throw new TypeError("legacy issue fields are not apply-compatible");
    if (declaration.target === "issue_type") {
      const selection = selectWorkTypeProvider({ projectOwnerKind: snapshot.projectOwnerKind ?? snapshot.ownerKind, repositoryOwnerKind: snapshot.repositoryOwnerKind ?? snapshot.ownerKind, desired: String(desired), nativeValue: observed.issueType, projectValue: observed.values[declaration.projectField], issueTypes: snapshot.issueTypes, fields: snapshot.fields, fieldName: declaration.projectField });
      if (selection.converged) continue;
      if (selection.provider === "native_issue_type") {
        operations.push({ operationKey: operationKey("issue", "type", "set"), type: "set_issue_type", subject: { ref: scope.subjectRef }, resource: { kind: "issue_type", logicalKey: key, scopeRef: scope.repositoryRef, providerRef: selection.issueTypeId }, action: "set", environment: "dry-run", reason: "legacy.issue_type.differs", preconditions: [{ kind: "old_value", logicalKey: key, expected: observed.issueType ?? null }], dependsOn: [], desired });
        continue;
      }
    }
    if (observed.values[declaration.projectField] === desired) continue;
    const field2 = snapshot.fields.find((value2) => value2.name === declaration.projectField), createKey = operationKey("schema", "field", key, "create");
    if (!field2) operations.push({ operationKey: createKey, type: "create_field", subject: { ref: scope.subjectRef }, resource: { kind: "project_field", logicalKey: key, scopeRef: scope.projectRef }, action: "create", environment: "dry-run", reason: "legacy.project_field.missing", preconditions: [{ kind: "field_absent", logicalKey: key, expected: true }], dependsOn: [], desired: declaration.projectField });
    operations.push({ operationKey: operationKey("item", "field", key, "set"), type: "set_field_value", subject: { ref: scope.subjectRef }, resource: { kind: "project_item_field", logicalKey: key, scopeRef: scope.projectRef, ...field2 ? { providerRef: field2.id } : {} }, action: "set", environment: "dry-run", reason: "legacy.project_field.differs", preconditions: [{ kind: "item_fingerprint", logicalKey: "item", expected: observed.fingerprint }, { kind: "old_value", logicalKey: key, expected: observed.values[declaration.projectField] ?? null }], dependsOn: field2 ? [] : [createKey], desired });
  }
  if (contract.milestone || Object.values(policy.fields).some((field2) => Object.keys(field2.labels).length)) throw new TypeError("legacy labels or milestones are not apply-compatible");
  if (contract.parent !== void 0 && contract.parent !== observed.parent) operations.push({ operationKey: operationKey("relationship", "parent", contract.parent, "set"), type: "set_parent", subject: { ref: scope.subjectRef }, resource: { kind: "issue_parent", logicalKey: "parent", scopeRef: scope.repositoryRef }, action: "set", environment: "dry-run", reason: "legacy.parent.missing", preconditions: [{ kind: "parent_absent", logicalKey: "parent", expected: true }], dependsOn: [], desired: contract.parent });
  if (contract.dependsOn.length || contract.blocks.length) throw new TypeError("legacy dependency apply requires complete graph planning");
  return finish2(operations);
}

// src/controlled-legacy-apply-host.ts
var KIND = { create_field: "create_project_field", add_option: "update_project_field_options", set_field_value: "update_project_item_field_value", set_issue_type: "set_issue_type", set_parent: "add_sub_issue", add_dependency: "add_blocked_by" };
function sameResource(a, b) {
  return a.resource.kind === b.resource.kind && a.resource.logicalKey === b.resource.logicalKey && a.resource.scopeRef === b.resource.scopeRef;
}
function exact2(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}
function createControlledLegacyApplyHostFactory(options) {
  if (!options || options.coordination.epoch !== options.coordinationEpoch || options.allowedIssuerRefs.length < 1 || new Set(options.allowedIssuerRefs).size !== options.allowedIssuerRefs.length) throw new TypeError("invalid controlled apply host configuration");
  const coordinationStore = createApplyCoordinationHttpStore(options.coordination), clock = options.nowMs ?? Date.now;
  return { create: async (input2) => {
    if (input2.readToken === input2.writeToken) throw new TypeError("credential profiles must be distinct");
    const policy = parseLegacyPolicy(input2.policySource), includeIssueTypes = Object.values(policy.fields).some((field2) => field2.target === "issue_type"), ledger = createGitHubRateLedger(options.rate), reader = createRestProjectSnapshotReader({ token: input2.readToken, fetch: options.readFetch, rateLedger: ledger, graphqlRemaining: options.rate.graphqlRemaining, includeIssueTypes }), snapshotInput = { ownerLogin: input2.requestedScope.ownerLogin, repositoryName: input2.requestedScope.repositoryName, projectNumber: input2.requestedScope.projectNumber, issueNumbers: [input2.requestedScope.issueNumber] }, mutation = createGitHubMutationTransport({ token: input2.writeToken, permissions: options.permissions, approvedKinds: options.approvedKinds, fetch: options.writeFetch, rateLedger: ledger });
    const replan = async () => planLegacyReconciliation(input2.policySource, await reader.read(snapshotInput), input2.requestedScope.issueNumber), initial = await reader.read(snapshotInput), scope = { subjectRef: initial.subjectRef, repositoryRef: initial.repositoryRef, projectRef: initial.projectRef, issueRef: initial.issues.get(input2.requestedScope.issueNumber).issueRef, issueNumber: input2.requestedScope.issueNumber };
    const variables2 = async (operation) => {
      const snapshot = await reader.read(snapshotInput), issue = snapshot.issues.get(input2.requestedScope.issueNumber);
      if (!issue) throw new ApplyPortError("invariant");
      const declaration = policy.fields[operation.resource.logicalKey];
      if (operation.type === "create_field") {
        const repositoryOwner = snapshot.repositoryOwnerKind ?? snapshot.ownerKind;
        if (!declaration || declaration.target !== "project_field" && !(declaration.target === "issue_type" && repositoryOwner === "users")) throw new ApplyPortError("invariant");
        const names = Object.values(declaration.values);
        return { kind: "create_project_field", ownerKind: snapshot.projectOwnerKind ?? snapshot.ownerKind, ownerLogin: snapshot.projectOwnerLogin ?? snapshot.ownerLogin, projectNumber: snapshot.projectNumber, dataType: names.length ? "SINGLE_SELECT" : declaration.type === "number" ? "NUMBER" : declaration.type === "date" ? "DATE" : "TEXT", name: declaration.projectField, ...names.length ? { options: [...new Set(names)].sort().map((name) => ({ name, color: "GRAY", description: "" })) } : {} };
      }
      if (operation.type === "set_field_value") {
        if (!declaration) throw new ApplyPortError("invariant");
        const field2 = snapshot.fields.find((value3) => value3.name === declaration.projectField);
        if (!field2) throw new ApplyPortError("invariant");
        const desired = operation.desired;
        const value2 = field2.kind === "number" ? { number: Number(desired) } : field2.kind === "date" ? { date: String(desired) } : field2.kind === "text" ? { text: String(desired) } : (() => {
          const option2 = field2.options.find((value3) => value3.name === String(desired));
          if (!option2) throw new ApplyPortError("invariant");
          return { singleSelectOptionId: option2.id };
        })();
        return { kind: "update_project_item_field_value", projectId: snapshot.projectRef, itemId: issue.itemRef, fieldId: field2.id, value: value2 };
      }
      if (operation.type === "set_issue_type") {
        if (typeof operation.desired !== "string") throw new ApplyPortError("invariant");
        return { kind: "set_issue_type", ownerLogin: snapshot.ownerLogin, repositoryName: snapshot.repositoryName, issueNumber: input2.requestedScope.issueNumber, issueTypeName: operation.desired };
      }
      if (operation.type === "set_parent") {
        const parent = Number(operation.desired), related = await reader.read({ ...snapshotInput, issueNumbers: [input2.requestedScope.issueNumber, parent] }), parentIssue = related.issues.get(parent);
        if (!parentIssue) throw new ApplyPortError("invariant");
        return { kind: "add_sub_issue", parentIssueId: parentIssue.issueRef, subIssueId: issue.issueRef };
      }
      throw new ApplyPortError("invariant");
    };
    return { scope, host: { enablement: options.enablement, allowedIssuerRefs: options.allowedIssuerRefs, holderDigest: options.holderDigest, coordinationEpoch: options.coordinationEpoch, coordinationStore, ports: { nowMs: clock, replan, inspect: async (operation) => {
      const plan = await replan(), found = plan.operations.find((candidate) => candidate.operationKey === operation.operationKey);
      if (found) return exact2(found, operation) ? "ready" : "mismatch";
      return plan.operations.some((candidate) => sameResource(candidate, operation)) ? "mismatch" : "already_converged";
    }, mutate: async (kind2, operation, clientMutationId) => {
      if (KIND[operation.type] !== kind2) throw new ApplyPortError("invariant");
      try {
        await mutation.execute(kind2, await variables2(operation), clientMutationId);
      } catch (error) {
        throw normalizeGitHubApplyFailure(error);
      }
    }, invalidateAfterMutation: async (kind2) => reader.invalidate(snapshotInput, snapshotInvalidationForMutation(kind2)), verify: async (operation) => {
      const plan = await replan();
      return !plan.operations.some((candidate) => sameResource(candidate, operation));
    }, audit: options.audit ?? (async () => {
    }) } } };
  } };
}

// src/controlled-apply-host.ts
var KIND2 = { create_field: "create_project_field", add_option: "update_project_field_options", set_field_value: "update_project_item_field_value", set_issue_type: "set_issue_type", set_parent: "add_sub_issue", add_dependency: "add_blocked_by" };
function failure3(value2) {
  throw new ApplyPortError(value2.failureClass === "authentication" ? "authentication" : value2.failureClass === "authorization" ? "authorization" : value2.failureClass === "deferred" ? "deferred_rate_budget" : value2.failureClass === "provider" ? "provider" : "invariant");
}
function sameResource2(a, b) {
  return a.resource.kind === b.resource.kind && a.resource.logicalKey === b.resource.logicalKey && a.resource.scopeRef === b.resource.scopeRef;
}
function exact3(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}
function digest4(value2) {
  return createHash8("sha256").update(canonicalJson(value2)).digest("hex");
}
function field(snapshot, prepared, key) {
  const declaration = prepared.policy.fields[key], found = declaration && snapshot.fields.find((value2) => value2.name === declaration.name);
  if (!declaration || !found) throw new ApplyPortError("invariant");
  return { declaration, found };
}
async function variables(operation, prepared, reader, input2) {
  const snapshot = await reader.read(input2), issue = snapshot.issues.get(input2.issueNumbers[0]);
  if (!issue) throw new ApplyPortError("invariant");
  if (operation.type === "create_field") {
    const declaration = prepared.policy.fields[operation.resource.logicalKey];
    if (!declaration || declaration.kind === "iteration") throw new ApplyPortError("invariant");
    const dataType = { text: "TEXT", number: "NUMBER", date: "DATE", single_select: "SINGLE_SELECT" };
    return { kind: "create_project_field", ownerKind: snapshot.projectOwnerKind ?? snapshot.ownerKind, ownerLogin: snapshot.projectOwnerLogin ?? snapshot.ownerLogin, projectNumber: snapshot.projectNumber, dataType: dataType[declaration.kind], name: declaration.name, ...declaration.kind === "single_select" ? { options: Object.values(declaration.options ?? {}).map((name) => ({ name, color: "GRAY", description: "" })) } : {} };
  }
  if (operation.type === "add_option") {
    const key = operation.resource.logicalKey.split(".")[0], { declaration, found } = field(snapshot, prepared, key), name = String(operation.desired ?? declaration.options?.[operation.resource.logicalKey.split(".")[1] ?? ""]);
    if (!name || found.options.some((option2) => option2.color === void 0 || option2.description === void 0)) throw new ApplyPortError("invariant");
    return { kind: "update_project_field_options", fieldId: found.id, observedOptions: found.options.map((option2) => ({ id: option2.id, name: option2.name, color: option2.color, description: option2.description })), newOption: { name, color: "GRAY", description: "" } };
  }
  if (operation.type === "set_field_value") {
    const { declaration, found } = field(snapshot, prepared, operation.resource.logicalKey);
    let value2;
    if (declaration.kind === "number") value2 = { number: Number(operation.desired) };
    else if (declaration.kind === "date") value2 = { date: String(operation.desired) };
    else if (declaration.kind === "text") value2 = { text: String(operation.desired) };
    else {
      const option2 = found.options.find((candidate) => candidate.name === String(operation.desired));
      if (!option2) throw new ApplyPortError("invariant");
      value2 = declaration.kind === "iteration" ? { iterationId: option2.id } : { singleSelectOptionId: option2.id };
    }
    return { kind: "update_project_item_field_value", projectId: snapshot.projectRef, itemId: issue.itemRef, fieldId: found.id, value: value2 };
  }
  if (operation.type === "set_issue_type") {
    if (typeof operation.desired !== "string") throw new ApplyPortError("invariant");
    return { kind: "set_issue_type", ownerLogin: snapshot.ownerLogin, repositoryName: snapshot.repositoryName, issueNumber: input2.issueNumbers[0], issueTypeName: operation.desired };
  }
  if (operation.type === "set_parent") {
    const parent = Number(operation.desired), related2 = await reader.read({ ...input2, issueNumbers: [input2.issueNumbers[0], parent] });
    const parentIssue = related2.issues.get(parent), child = related2.issues.get(input2.issueNumbers[0]);
    if (!parentIssue || !child) throw new ApplyPortError("invariant");
    return { kind: "add_sub_issue", parentIssueId: parentIssue.issueRef, subIssueId: child.issueRef };
  }
  const match = operation.resource.logicalKey.match(/^(\d+)->(\d+)$/u);
  if (!match) throw new ApplyPortError("invariant");
  const from = Number(match[1]), to = Number(match[2]), related = await reader.read({ ...input2, issueNumbers: [from, to] }), blocking = related.issues.get(from), blocked = related.issues.get(to);
  if (!blocking || !blocked) throw new ApplyPortError("invariant");
  return { kind: "add_blocked_by", blockedIssueId: blocked.issueRef, blockingIssueId: blocking.issueRef };
}
function createNativeControlledApplyHostFactory(options) {
  if (!options || options.coordination.epoch !== options.coordinationEpoch || options.allowedIssuerRefs.length < 1 || new Set(options.allowedIssuerRefs).size !== options.allowedIssuerRefs.length) throw new TypeError("invalid controlled apply host configuration");
  const coordinationStore = createApplyCoordinationHttpStore(options.coordination), clock = options.nowMs ?? Date.now;
  return { create: async (input2) => {
    if (input2.readToken === input2.writeToken) throw new TypeError("credential profiles must be distinct");
    const ledger = createGitHubRateLedger(options.rate), reader = createRestProjectSnapshotReader({ token: input2.readToken, fetch: options.readFetch, rateLedger: ledger, graphqlRemaining: options.rate.graphqlRemaining }), snapshotInput = { ownerLogin: input2.requestedScope.ownerLogin, repositoryName: input2.requestedScope.repositoryName, projectNumber: input2.requestedScope.projectNumber, issueNumbers: [input2.requestedScope.issueNumber] }, mutation = createGitHubMutationTransport({ token: input2.writeToken, permissions: options.permissions, approvedKinds: options.approvedKinds, fetch: options.writeFetch, rateLedger: ledger });
    let latest;
    const replan = async () => {
      const prepared = await prepareReconciliation({ scope: input2.requestedScope, policySource: input2.policySource, transport: createGitHubRestSnapshotReadTransportFromReader(reader) });
      if (prepared.status !== "success") return failure3(prepared);
      latest = prepared;
      return prepared.plan;
    };
    await replan();
    const scope = latest.observation.scope;
    return { scope, deferredReceipt: () => {
      const resource = ledger.snapshot().deferredResource ?? "graphql", issuedAtMs = clock();
      return createGovernedHandoffReceipt({ resource, issuedAtMs, scopeDigest: digest4(scope), requestDigest: digest4({ scope, policyDigest: digest4(input2.policySource) }), planDigest: latest?.plan.planId ?? null, freshApprovalRequired: true });
    }, host: { enablement: options.enablement, allowedIssuerRefs: options.allowedIssuerRefs, holderDigest: options.holderDigest, coordinationEpoch: options.coordinationEpoch, coordinationStore, ports: { nowMs: clock, replan, inspect: async (operation) => {
      const plan = await replan(), found = plan.operations.find((candidate) => candidate.operationKey === operation.operationKey);
      if (found) return exact3(found, operation) ? "ready" : "mismatch";
      return plan.operations.some((candidate) => sameResource2(candidate, operation)) ? "mismatch" : "already_converged";
    }, mutate: async (kind2, operation, clientMutationId) => {
      if (KIND2[operation.type] !== kind2) throw new ApplyPortError("invariant");
      try {
        await mutation.execute(kind2, await variables(operation, latest, reader, snapshotInput), clientMutationId);
      } catch (error) {
        throw normalizeGitHubApplyFailure(error);
      }
    }, invalidateAfterMutation: async (kind2) => reader.invalidate(snapshotInput, snapshotInvalidationForMutation(kind2)), verify: async (operation) => {
      const plan = await replan();
      return !plan.operations.some((candidate) => sameResource2(candidate, operation));
    }, audit: options.audit ?? (async () => {
    }) } } };
  } };
}
function createControlledApplyHostFactory(options) {
  const native = createNativeControlledApplyHostFactory(options), legacy = createControlledLegacyApplyHostFactory(options);
  return { create: (input2) => /^\s*version:\s*1\s*$/mu.test(input2.policySource) ? legacy.create(input2) : native.create(input2) };
}

// src/protected-host-capsule.ts
import { createHash as createHash9, createPrivateKey, randomUUID, sign } from "node:crypto";
var DIGEST6 = /^[a-f0-9]{64}$/u;
var KINDS2 = ["create_project_field", "update_project_field_options", "update_project_item_field_value", "add_sub_issue", "add_blocked_by"];
function rec5(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function exact4(v, keys2) {
  if (Object.keys(v).sort().join("\0") !== [...keys2].sort().join("\0")) throw new TypeError("invalid host capsule");
}
function text4(v, max = 256) {
  if (typeof v !== "string" || v.length < 1 || v.length > max || /[\u0000-\u001f\u007f]/u.test(v)) throw new TypeError("invalid host capsule");
  return v;
}
function integer3(v, min = 0) {
  if (!Number.isSafeInteger(v) || v < min) throw new TypeError("invalid host capsule");
  return v;
}
function b64(value2) {
  return Buffer.from(value2).toString("base64url");
}
function canonical2(value2) {
  if (value2 === null || typeof value2 === "boolean" || typeof value2 === "string") return JSON.stringify(value2);
  if (typeof value2 === "number") {
    if (!Number.isSafeInteger(value2)) throw new TypeError("invalid host capsule");
    return String(value2);
  }
  if (Array.isArray(value2)) return `[${value2.map(canonical2).join(",")}]`;
  if (!rec5(value2)) throw new TypeError("invalid host capsule");
  return `{${Object.keys(value2).sort().map((key) => `${JSON.stringify(key)}:${canonical2(value2[key])}`).join(",")}}`;
}
function proofFactory(credential, jwk, nowMs, jti) {
  let key;
  try {
    key = createPrivateKey({ key: jwk, format: "jwk" });
  } catch {
    throw new TypeError("invalid host capsule");
  }
  if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1" || typeof jwk.x !== "string" || typeof jwk.y !== "string" || jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.d !== "string") throw new TypeError("invalid host capsule");
  const publicJwk = { crv: "P-256", kty: "EC", x: jwk.x, y: jwk.y };
  return async (request) => {
    const header = b64(canonical2({ alg: "ES256", jwk: publicJwk, typ: "dpop+jwt" })), payload = b64(canonical2({ ath: b64(createHash9("sha256").update(credential).digest()), htm: request.method, htu: request.targetUri, iat: Math.floor(nowMs() / 1e3), jti: text4(jti(), 128) })), input2 = `${header}.${payload}`, signature = sign("sha256", Buffer.from(input2), { key, dsaEncoding: "ieee-p1363" });
    return { credential, proof: `${input2}.${b64(signature)}` };
  };
}
function parseProtectedHostCapsule(source, binding, runtime = {}) {
  let value2;
  try {
    value2 = JSON.parse(source);
  } catch {
    throw new TypeError("invalid host capsule");
  }
  if (!rec5(value2) || canonical2(value2) !== source) throw new TypeError("invalid host capsule");
  exact4(value2, ["schema", "version", "issued_at_ms", "expires_at_ms", "scope", "enablement", "allowed_issuer_refs", "holder_digest", "coordination", "permissions", "approved_kinds", "rate"]);
  if (value2.schema !== 1 || value2.version !== "protected-host-capsule-v1" || value2.enablement !== "apply-explicitly-enabled" || !DIGEST6.test(String(value2.holder_digest))) throw new TypeError("invalid host capsule");
  const now = runtime.nowMs ?? Date.now, issued = integer3(value2.issued_at_ms), expires = integer3(value2.expires_at_ms);
  if (issued > now() || expires < now() || expires - issued > 15 * 60 * 1e3) throw new TypeError("invalid host capsule");
  if (!rec5(value2.scope)) throw new TypeError("invalid host capsule");
  exact4(value2.scope, ["owner", "repository", "project_number", "issue_number", "environment"]);
  if (value2.scope.owner !== binding.scope.ownerLogin || value2.scope.repository !== binding.scope.repositoryName || value2.scope.project_number !== binding.scope.projectNumber || value2.scope.issue_number !== binding.scope.issueNumber || value2.scope.environment !== binding.environment) throw new TypeError("invalid host capsule");
  if (!Array.isArray(value2.allowed_issuer_refs) || value2.allowed_issuer_refs.length < 1 || value2.allowed_issuer_refs.length > 16) throw new TypeError("invalid host capsule");
  const issuers = value2.allowed_issuer_refs.map((v) => text4(v));
  if (new Set(issuers).size !== issuers.length) throw new TypeError("invalid host capsule");
  if (!rec5(value2.coordination)) throw new TypeError("invalid host capsule");
  exact4(value2.coordination, ["base_uri", "epoch", "credential", "dpop_private_jwk"]);
  const baseUri = text4(value2.coordination.base_uri, 1024), epoch = integer3(value2.coordination.epoch, 1), credential = text4(value2.coordination.credential, 8192);
  if (!rec5(value2.coordination.dpop_private_jwk)) throw new TypeError("invalid host capsule");
  if (!rec5(value2.permissions)) throw new TypeError("invalid host capsule");
  exact4(value2.permissions, ["projects", "issues", "extra_permissions"]);
  if (!["none", "read", "write"].includes(String(value2.permissions.projects)) || !["none", "read", "write"].includes(String(value2.permissions.issues)) || !Array.isArray(value2.permissions.extra_permissions) || value2.permissions.extra_permissions.length !== 0) throw new TypeError("invalid host capsule");
  if (!Array.isArray(value2.approved_kinds) || value2.approved_kinds.length < 1 || value2.approved_kinds.some((v) => !KINDS2.includes(v)) || new Set(value2.approved_kinds).size !== value2.approved_kinds.length) throw new TypeError("invalid host capsule");
  if (!rec5(value2.rate)) throw new TypeError("invalid host capsule");
  exact4(value2.rate, ["rest_remaining", "graphql_remaining", "rest_reserve", "graphql_reserve", "max_rest_requests", "max_graphql_requests", "max_graphql_points"]);
  const rate = { restRemaining: integer3(value2.rate.rest_remaining), graphqlRemaining: integer3(value2.rate.graphql_remaining), restReserve: integer3(value2.rate.rest_reserve, 500), graphqlReserve: integer3(value2.rate.graphql_reserve, 500), maxRestRequests: integer3(value2.rate.max_rest_requests, 1), maxGraphqlRequests: integer3(value2.rate.max_graphql_requests), maxGraphqlPoints: integer3(value2.rate.max_graphql_points) };
  const authenticate = proofFactory(credential, value2.coordination.dpop_private_jwk, now, runtime.jti ?? randomUUID);
  return { options: { enablement: "apply-explicitly-enabled", allowedIssuerRefs: issuers, holderDigest: String(value2.holder_digest), coordinationEpoch: epoch, coordination: { baseUri, epoch, deadlineMs: 5e3, authenticate }, permissions: { projects: value2.permissions.projects, issues: value2.permissions.issues, extraPermissions: [] }, approvedKinds: value2.approved_kinds, rate, nowMs: now } };
}

// src/apply-cli-main.ts
var exit = 2;
try {
  const argv = process.argv.slice(2), parsed = parseApplyCliArgs(argv), source = await readBoundedFd(parsed.hostCapsuleFd, 64 * 1024), scope = parseRuntimeScope({ owner: parsed.owner, repository: parsed.repository, projectNumber: parsed.projectNumber, issueNumber: parsed.issueNumber }), runtime = parseProtectedHostCapsule(source, { scope, environment: parsed.environment });
  exit = await applyCliMain(argv, process.cwd(), createControlledApplyHostFactory(runtime.options), (value2) => process.stdout.write(value2));
} catch {
  process.stdout.write('{"schema":1,"status":"error","planId":"invalid","counts":{"already_converged":0,"verified":0,"failed":0,"not_attempted":0},"remaining":0,"diagnostics":[{"code":"YKP-APPLY-001","severity":"error","message":"apply request is invalid"}]}\n');
}
process.exitCode = exit;
