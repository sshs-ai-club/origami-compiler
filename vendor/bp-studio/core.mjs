// Box Pleating Studio core, (c) 2020-present Mu-Tsun Tsai, MIT licence (see LICENSE.md). Built from commit 507981157194b13634761c3a2e39565754b6cbbb by vendor/bp-studio/build.sh. Do not edit.

// ../bp-studio/box-pleating-studio/src/shared/data/heap/heap.ts
var minComparator = (a, b) => a - b;
var Heap = class {
  constructor(comparator) {
    this._comparator = comparator;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _swap(a, b) {
    const temp = this._data[a];
    this._data[a] = this._data[b];
    this._data[b] = temp;
  }
  _shouldSwap(a, b) {
    return b < this._data.length && this._comparator(this._data[a], this._data[b]) > 0;
  }
  _trySwap(a, b) {
    if (!this._shouldSwap(a, b)) return false;
    this._swap(a, b);
    return true;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/heap/binaryHeap.ts
var BinaryHeap = class extends Heap {
  constructor() {
    super(...arguments);
    /** All elements. The index starts at 1. */
    this._data = [null];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Interface methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  $insert(value) {
    this._data.push(value);
    this._moveBackward(this._data.length - 1);
  }
  get $isEmpty() {
    return this._data.length === 1;
  }
  get $size() {
    return this._data.length - 1;
  }
  $pop() {
    if (this.$isEmpty) return void 0;
    const result = this._data[1];
    if (this._data.length > 2) {
      this._swap(1, this._data.length - 1);
      this._data.pop();
      this._moveForward(1);
    } else {
      this._data.pop();
    }
    return result;
  }
  $get() {
    return this._data[1];
  }
  $getSecond() {
    if (this._data.length <= 2) return void 0;
    let index = 2;
    if (this._shouldSwap(index, 3)) index = 3;
    return this._data[index];
  }
  [Symbol.iterator]() {
    const result = this._data.values();
    result.next();
    return result;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _moveForward(index) {
    let result = false;
    while (true) {
      let child = index << 1;
      if (this._shouldSwap(child, child + 1)) child++;
      if (!this._trySwap(index, child)) break;
      index = child;
      result = true;
    }
    return result;
  }
  _moveBackward(index) {
    let result = false;
    while (true) {
      const parent = index >>> 1;
      if (!parent || !this._trySwap(parent, index)) break;
      index = parent;
      result = true;
    }
    return result;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/heap/mutableHeap.ts
var MutableHeap = class extends BinaryHeap {
  constructor() {
    super(...arguments);
    /**
     * Index map, which performs a reverse lookup of the index position of the incoming element.
     *
     * The use of {@link WeakMap} here seems to be overkill,
     * but in fact the JavaScript engine has a strong optimization in this part,
     * and using {@link Symbol} directly on the element to store the reverse lookup
     * index is actually almost of the same performance.
     * In addition, because we only care about the mapping relationship here,
     * the performance of using {@link WeakMap} will be better than {@link Map}.
     */
    this._indices = /* @__PURE__ */ new WeakMap();
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Interface methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  $insert(value) {
    const index = this._data.length;
    this._data.push(value);
    this._indices.set(value, index);
    this._moveBackward(index);
  }
  $remove(value) {
    const index = this._indices.get(value);
    if (index === void 0 || index >= this._data.length) return;
    const last = this._data.pop();
    if (index === this._data.length) return;
    this._indices.set(last, index);
    this._data[index] = last;
    this._moveForward(index);
  }
  $notifyUpdate(value) {
    const index = this._indices.get(value);
    if (index === void 0) return;
    if (!this._moveBackward(index)) {
      this._moveForward(index);
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _swap(a, b) {
    super._swap(a, b);
    this._indices.set(this._data[a], a);
    this._indices.set(this._data[b], b);
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/context/aabb/aabbSide.ts
var AABBSide = class {
  constructor(comparator) {
    /** Additional spacing (corresponding to the width of the river) */
    this.$margin = 0;
    /** The value of self as free variable */
    this.$value = 0;
    this._heap = new MutableHeap(comparator);
  }
  /** The key of self in the heap of the parent node. */
  get $key() {
    return this.$base + this.$margin;
  }
  /** The value of self, without margin. */
  get $base() {
    return this._heap.$isEmpty ? this.$value : this._cache;
  }
  $addChild(child) {
    this._heap.$insert(child);
    return this._compareAndUpdateCache();
  }
  $removeChild(child) {
    this._heap.$remove(child);
    return this._compareAndUpdateCache();
  }
  $updateChild(child) {
    this._heap.$notifyUpdate(child);
    return this._compareAndUpdateCache();
  }
  _compareAndUpdateCache() {
    const currentValue = this._heap.$get()?.$key;
    const result = currentValue !== this._cache;
    this._cache = currentValue;
    return result;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/types/direction.ts
var quadrantNumber = 4;
var quadrants = perQuadrant([0, 1, 2, 3]);
var previousQuadrantOffset = 3;
var nextQuadrantOffset = 1;
function perQuadrant(args) {
  return args;
}
function opposite(direction) {
  return (direction + 2) % quadrantNumber;
}
function makePerQuadrant(factory) {
  return quadrants.map(factory);
}
var QUADRANT_MASK = 3;
function getNodeId(code) {
  return code >>> 2;
}
function getQuadrant(code) {
  return code & QUADRANT_MASK;
}
function makeQuadrantCode(id, q) {
  return id << 2 | q;
}

// ../bp-studio/box-pleating-studio/src/core/design/context/aabb/aabb.ts
var SIDES = [0 /* top */, 1 /* right */, 2 /* bottom */, 3 /* left */];
var minKeyComparator = (a, b) => a.$key - b.$key;
var maxKeyComparator = (a, b) => b.$key - a.$key;
var AABB = class {
  constructor() {
    this._sides = [
      new AABBSide(maxKeyComparator),
      // top
      new AABBSide(maxKeyComparator),
      // right
      new AABBSide(minKeyComparator),
      // bottom
      new AABBSide(minKeyComparator)
      // left
    ];
  }
  $intersects(that, gap) {
    return this._sides[3 /* left */].$base - gap < that._sides[1 /* right */].$base && this._sides[1 /* right */].$base + gap > that._sides[3 /* left */].$base && this._sides[0 /* top */].$base + gap > that._sides[2 /* bottom */].$base && this._sides[2 /* bottom */].$base - gap < that._sides[0 /* top */].$base;
  }
  $update(top, right, bottom, left) {
    this._sides[0 /* top */].$value = top;
    this._sides[1 /* right */].$value = right;
    this._sides[2 /* bottom */].$value = bottom;
    this._sides[3 /* left */].$value = left;
    this.$points = toCorners([top, right, bottom, left]);
  }
  $setMargin(m) {
    this._sides[0 /* top */].$margin = m;
    this._sides[1 /* right */].$margin = m;
    this._sides[2 /* bottom */].$margin = -m;
    this._sides[3 /* left */].$margin = -m;
  }
  /** For testing purpose */
  $toArray() {
    return this._sides.map((s) => s.$key);
  }
  /** Returns the values (without margin) of the four sides. */
  $toValues() {
    return this._sides.map((s) => s.$value);
  }
  $toRoundedRect(extraUnits) {
    const radius = this._sides[0 /* top */].$margin + extraUnits;
    const [t, r, b, l] = this._sides.map((s) => s.$value);
    return {
      x: l,
      y: b,
      width: r - l,
      height: t - b,
      radius
    };
  }
  /**
   * Return the hinge path.
   * The points are in quadrant ordering.
   */
  $toPath() {
    return toCorners(this._sides.map((s) => s.$value + s.$margin));
  }
  $addChild(child) {
    let updated = false;
    for (const side of SIDES) {
      if (this._sides[side].$addChild(child._sides[side])) {
        updated = true;
      }
    }
    return updated;
  }
  $removeChild(child) {
    let updated = false;
    for (const side of SIDES) {
      if (this._sides[side].$removeChild(child._sides[side])) {
        updated = true;
      }
    }
    return updated;
  }
  $updateChild(child) {
    let updated = false;
    for (const side of SIDES) {
      if (this._sides[side].$updateChild(child._sides[side])) {
        updated = true;
      }
    }
    return updated;
  }
};
function toCorners([t, r, b, l]) {
  return perQuadrant([
    { x: r, y: t },
    { x: l, y: t },
    { x: l, y: b },
    { x: r, y: b }
  ]);
}

// ../bp-studio/box-pleating-studio/src/shared/data/base/doubleLink.ts
function unlink(node, noPrevCallback) {
  const prev = node._prev, next = node._next;
  if (prev) prev._next = next;
  else if (noPrevCallback) noPrevCallback(next);
  if (next) next._prev = prev;
}

// ../bp-studio/box-pleating-studio/src/shared/data/doubleMap/intDoubleMap.ts
var SHIFT = 16;
var MAX = (1 << SHIFT) - 1;
var IntDoubleMap = class {
  constructor() {
    /**
     * Key chains, storing "the keys coupling the given key",
     * for improving the performance of single key operations.
     */
    this._keyMap = /* @__PURE__ */ new Map();
    /**
     * The main map, combines the double key into a single integer
     * (see {@link _getKey _getKey()} method) and stores the corresponding node.
     */
    this._map = /* @__PURE__ */ new Map();
    /** Current size */
    this._size = 0;
  }
  set(key1, key2, value) {
    if (!checkKey(key1) || !checkKey(key2)) throw new Error("Invalid index");
    const key = getKey(key1, key2);
    let node = this._map.get(key);
    if (!node) {
      node = this._createNode(key1, key2, value);
      this._insertKeyNode(key1, node.n1);
      if (key1 !== key2) this._insertKeyNode(key2, node.n2);
      this._map.set(key, node);
    } else {
      this._changeValue(node, value);
    }
    return this;
  }
  get [Symbol.toStringTag]() {
    return `IntDoubleMap(${this._size})`;
  }
  has(...args) {
    const key1 = args[0];
    if (args.length === 1) {
      return this._keyMap.has(key1);
    } else {
      return this._map.has(getKey(key1, args[1]));
    }
  }
  get(...args) {
    const key1 = args[0];
    if (args.length === 1) {
      const temp = /* @__PURE__ */ new Map();
      let cursor = this._keyMap.get(key1);
      while (cursor) {
        const key2 = cursor.key;
        temp.set(key2, this.get(key1, key2));
        cursor = cursor._next;
      }
      return temp;
    } else {
      return this._map.get(getKey(key1, args[1]))?.value;
    }
  }
  get size() {
    return this._size;
  }
  clear() {
    this._keyMap.clear();
    this._map.clear();
    this._size = 0;
  }
  forEach(callbackfn, thisArg = this) {
    for (const [k1, k2, v] of this.entries()) {
      callbackfn.apply(thisArg, [v, k1, k2, this]);
    }
  }
  delete(...args) {
    const key1 = args[0];
    if (args.length === 1) {
      let cursor = this._keyMap.get(key1);
      if (!cursor) return false;
      while (cursor) {
        const key2 = cursor.key;
        const key = getKey(key1, key2);
        const node = this._map.get(key);
        if (key1 !== key2) {
          const n = node.n1.key === key1 ? node.n1 : node.n2;
          this._deleteKeyNode(key2, n);
        }
        this._deleteNode(key, node);
        cursor = cursor._next;
      }
      this._keyMap.delete(key1);
      return true;
    } else {
      const key2 = args[1];
      const key = getKey(key1, key2);
      const node = this._map.get(key);
      if (!node) return false;
      const oriented = node.n1.key !== key1;
      this._deleteKeyNode(key1, oriented ? node.n1 : node.n2);
      if (key1 !== key2) this._deleteKeyNode(key2, oriented ? node.n2 : node.n1);
      this._deleteNode(key, node);
      return true;
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  *entries() {
    for (const [k1, k2] of this.keys()) yield [k1, k2, this.get(k1, k2)];
  }
  *keys() {
    for (const key of this._map.keys()) yield getPair(key);
  }
  firstKeys() {
    return this._keyMap.keys();
  }
  *values() {
    for (const [k1, k2] of this.keys()) yield this.get(k1, k2);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _createNode(key1, key2, value) {
    const node = new Node(key1, key2, value);
    this._size++;
    return node;
  }
  _deleteNode(key, node) {
    this._map.delete(key);
    this._size--;
  }
  _deleteKeyNode(key, n) {
    if (n === this._keyMap.get(key)) {
      if (n._next) this._keyMap.set(key, n._next);
      else this._keyMap.delete(key);
    }
    unlink(n);
  }
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  _changeValue(node, value) {
    node.value = value;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _insertKeyNode(key, n) {
    const oldHead = this._keyMap.get(key);
    if (oldHead) {
      oldHead._prev = n;
      n._next = oldHead;
    }
    this._keyMap.set(key, n);
  }
};
function getKey(key1, key2) {
  return key1 < key2 ? key1 << SHIFT | key2 : key2 << SHIFT | key1;
}
function getOrderedKey(key1, key2) {
  return key1 << SHIFT | key2;
}
function getPair(key) {
  return [key >> SHIFT, key & MAX];
}
function checkKey(key) {
  return Number.isInteger(key) && key >= 0 && key <= MAX;
}
var Node = class {
  constructor(key1, key2, value) {
    this.n1 = { key: key2 };
    this.n2 = key1 !== key2 ? { key: key1 } : this.n1;
    this.value = value;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/diff/diffDoubleSet.ts
var DiffDoubleSet = class {
  constructor() {
    this._oldSet = /* @__PURE__ */ new Set();
    this._newSet = /* @__PURE__ */ new Set();
  }
  /** Signals the given key pair exists in the current round */
  $add(a, b) {
    const key = getKey(a, b);
    this._newSet.add(key);
    this._oldSet.delete(key);
  }
  /** Return those old key pairs that are absent in the current round since last called */
  *$diff() {
    for (const key of this._oldSet) yield getPair(key);
    this._oldSet = this._newSet;
    this._newSet = /* @__PURE__ */ new Set();
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  clear() {
    this._oldSet.clear();
    this._newSet.clear();
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/shared/data/diff/diffSet.ts
var DiffSet = class {
  constructor() {
    this._oldSet = /* @__PURE__ */ new Set();
    this._newSet = /* @__PURE__ */ new Set();
  }
  /** Signals the given value exists in the current round */
  $add(value) {
    this._newSet.add(value);
    this._oldSet.delete(value);
  }
  /** Return those old values that are absent in the current round since last called */
  *$diff() {
    for (const value of this._oldSet) yield value;
    this._oldSet = this._newSet;
    this._newSet = /* @__PURE__ */ new Set();
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  clear() {
    this._oldSet.clear();
    this._newSet.clear();
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/core/service/updateResult.ts
var UpdateResult;
((UpdateResult2) => {
  let _updateResult;
  function $edit(e) {
    _updateResult.edit.push(e);
  }
  UpdateResult2.$edit = $edit;
  function $addNode(id) {
    _updateResult.add.nodes.push(id);
  }
  UpdateResult2.$addNode = $addNode;
  function $removeNode(id) {
    _updateResult.remove.nodes.push(id);
  }
  UpdateResult2.$removeNode = $removeNode;
  function $addJunction(id, polygon) {
    _updateResult.add.junctions[id] = polygon;
  }
  UpdateResult2.$addJunction = $addJunction;
  function $removeJunction(id) {
    _updateResult.remove.junctions.push(id);
  }
  UpdateResult2.$removeJunction = $removeJunction;
  function $pruneJunctions(junctions) {
    for (const id of _updateResult.remove.nodes) {
      junctions.delete(id);
    }
  }
  UpdateResult2.$pruneJunctions = $pruneJunctions;
  function $addStretch(id, stretch) {
    _updateResult.add.stretches[id] = stretch;
  }
  UpdateResult2.$addStretch = $addStretch;
  function $updateStretch(id) {
    _updateResult.update.stretches.push(id);
  }
  UpdateResult2.$updateStretch = $updateStretch;
  function $removeStretch(id) {
    _updateResult.remove.stretches.push(id);
  }
  UpdateResult2.$removeStretch = $removeStretch;
  function $addGraphics(tag, data) {
    _updateResult.graphics[tag] = data;
  }
  UpdateResult2.$addGraphics = $addGraphics;
  function $setPatternNotFound() {
    _updateResult.patternNotFound = true;
  }
  UpdateResult2.$setPatternNotFound = $setPatternNotFound;
  function $exportTree(tree) {
    _updateResult.tree = tree;
  }
  UpdateResult2.$exportTree = $exportTree;
  function $flush() {
    const result = _updateResult;
    _reset();
    return result;
  }
  UpdateResult2.$flush = $flush;
  function _reset() {
    _updateResult = {
      add: {
        nodes: [],
        junctions: {},
        stretches: {}
      },
      update: {
        stretches: []
      },
      remove: {
        nodes: [],
        junctions: [],
        stretches: []
      },
      patternNotFound: false,
      edit: [],
      graphics: {}
    };
  }
  _reset();
})(UpdateResult || (UpdateResult = {}));

// ../bp-studio/box-pleating-studio/src/core/service/state.ts
var State;
((State2) => {
  State2.m = {
    $tree: void 0,
    $isDragging: false,
    $rootChanged: false,
    $treeStructureChanged: false
  };
  State2.$junctions = new IntDoubleMap();
  State2.$stretches = /* @__PURE__ */ new Map();
  State2.$invalidJunctionDiff = new DiffDoubleSet();
  State2.$stretchDiff = new DiffSet();
  State2.$stretchCache = /* @__PURE__ */ new Map();
  State2.$childrenChanged = /* @__PURE__ */ new Set();
  State2.$parentChanged = /* @__PURE__ */ new Set();
  State2.$lengthChanged = /* @__PURE__ */ new Set();
  State2.$subtreeAABBChanged = /* @__PURE__ */ new Set();
  State2.$nodeAABBChanged = /* @__PURE__ */ new Set();
  State2.$flapChanged = /* @__PURE__ */ new Set();
  State2.$newRepositories = /* @__PURE__ */ new Set();
  State2.$repoToProcess = /* @__PURE__ */ new Set();
  State2.$repoToPartiallyProcess = /* @__PURE__ */ new Map();
  State2.$repoWithNodeSetChanged = /* @__PURE__ */ new Set();
  State2.$stretchPrototypes = /* @__PURE__ */ new Map();
  State2.$roughContourChanged = /* @__PURE__ */ new Set();
  State2.$contourWillChange = /* @__PURE__ */ new Set();
  State2.$patternedQuadrants = /* @__PURE__ */ new Set();
  State2.$movedDevices = /* @__PURE__ */ new Set();
  function $reset() {
    State2.$childrenChanged.clear();
    State2.$parentChanged.clear();
    State2.$lengthChanged.clear();
    State2.$subtreeAABBChanged.clear();
    State2.$nodeAABBChanged.clear();
    State2.$flapChanged.clear();
    State2.$newRepositories.clear();
    State2.$repoToProcess.clear();
    State2.$repoToPartiallyProcess.clear();
    State2.$repoWithNodeSetChanged.clear();
    State2.$stretchPrototypes.clear();
    State2.$roughContourChanged.clear();
    State2.$contourWillChange.clear();
    State2.$patternedQuadrants.clear();
    State2.$movedDevices.clear();
    State2.m.$treeStructureChanged = false;
    State2.m.$rootChanged = false;
  }
  State2.$reset = $reset;
  $reset();
})(State || (State = {}));
function fullReset() {
  State.$reset();
  UpdateResult.$flush();
  State.$junctions.clear();
  State.$stretches.clear();
  State.$invalidJunctionDiff.clear();
  State.$stretchDiff.clear();
  State.$stretchCache.clear();
}

// ../bp-studio/box-pleating-studio/src/shared/types/constants.ts
var MAX_TREE_HEIGHT = 11586;

// ../bp-studio/box-pleating-studio/src/core/design/context/treeNode.ts
var maxDistComparator = (a, b) => b.$dist - a.$dist;
var maxHeightComparator = (a, b) => b.$height - a.$height;
var TreeNode = class {
  constructor(id, parent, length = 0) {
    this.$dist = 0;
    /**
     * The branch height under the node (0 for a leaf).
     *
     * We set the initial value to -1, so that changing is triggered on construction.
     */
    this.$height = -1;
    /** The AABB corresponding to the node and its parent edge. */
    this.$AABB = new AABB();
    /** All child nodes. Implemented using maximal heap. */
    this.$children = new MutableHeap(maxHeightComparator);
    this.$graphics = {
      $contours: [],
      $patternContours: [],
      $traceContours: [],
      $roughContours: [],
      $ridges: []
    };
    this.$length = 0;
    this.id = id;
    if (parent) {
      this.$length = length;
      this.$dist = parent.$dist + length;
      if (this.$dist > MAX_TREE_HEIGHT) throw new Error("tree overflow");
      this.$AABB.$setMargin(length);
      this.$pasteTo(parent);
    }
    State.$childrenChanged.add(this);
    UpdateResult.$addNode(id);
  }
  toJSON() {
    if (!this.$parent) throw new Error("Cannot export root node");
    return { n1: this.$parent.id, n2: this.id, length: this.$length };
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  get $leaves() {
    return this._leafList;
  }
  get $data() {
    return {
      id: this.id,
      dist: this.$dist,
      height: this.$height
    };
  }
  $updateLeaves() {
    if (this.$isLeaf) {
      this._leafList = [this];
    } else {
      this._leafList = [];
      for (const child of this.$children) {
        this._leafList.push(...child._leafList);
      }
    }
  }
  $setFlap(flap) {
    this.$setAABB(flap.y + flap.height, flap.x + flap.width, flap.y, flap.x);
  }
  /** For testing purpose. */
  $setAABB(top, right, bottom, left) {
    State.$nodeAABBChanged.add(this);
    this.$AABB.$update(top, right, bottom, left);
  }
  $pasteTo(parent) {
    this.$parent = parent;
    parent.$children.$insert(this);
    State.$parentChanged.add(this);
    State.$childrenChanged.add(parent);
  }
  /**
   * Temporarily disconnects a node from the tree, without changing its subtree.
   */
  $cut() {
    if (!this.$parent) return;
    this.$parent.$children.$remove(this);
    if (this.$parent.$AABB.$removeChild(this.$AABB)) {
      State.$nodeAABBChanged.add(this.$parent);
    }
    State.$childrenChanged.add(this.$parent);
    this.$parent = void 0;
  }
  /** Whether this {@link TreeNode} is a directed leaf. */
  get $isLeaf() {
    return this.$children.$isEmpty;
  }
  /**
   * Whether this {@link TreeNode} is a directed leaf,
   * or is a root node with only one child.
   *
   * This is used only before balancing,
   * when the root can temporarily become a leaf.
   * After that, the more efficient {@link $isLeaf} should be used instead.
   */
  get $isLeafLike() {
    const childCount = this.$children.$size;
    return !this.$parent && childCount === 1 || childCount === 0;
  }
  /** The tag used for identifying objects in API. */
  get $tag() {
    if (this.$isLeaf) return "f" + this.id;
    if (!this.$parent) return "root";
    const pid = this.$parent.id;
    if (this.id < pid) return `re${this.id},${pid}`;
    else return `re${pid},${this.id}`;
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/context/tree.ts
var Tree = class {
  constructor(edges, flaps) {
    /**
     * The ids of those {@link TreeNode} that might be deleted in current round.
     * Some of them might get added back to the tree,
     * so we need to double-check in {@link $flushRemove $flushRemove()}.
     */
    this._pendingRemove = /* @__PURE__ */ new Set();
    this._nodes = new Array(edges.length + 1);
    while (edges.length) {
      const remain = [];
      let newEdgeAdded = false;
      for (const e of edges) {
        if (this._setEdge(e.n1, e.n2, e.length)) {
          newEdgeAdded = true;
        } else {
          remain.push(e);
        }
      }
      if (!newEdgeAdded) break;
      edges = remain;
    }
    if (flaps) {
      for (const flap of flaps) {
        const node = this._nodes[flap.id];
        if (node) node.$setFlap(flap);
      }
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  toJSON() {
    const result = {
      edges: [],
      nodes: []
    };
    const queue = [this.$root];
    while (queue.length) {
      const node = queue.shift();
      for (const childNode of node.$children) {
        result.edges.push(childNode.toJSON());
        result.nodes.push(childNode.$data);
        if (!childNode.$isLeaf) queue.push(childNode);
      }
    }
    return result;
  }
  get $nodes() {
    return this._nodes;
  }
  $removeLeaf(id) {
    const node = this._nodes[id];
    if (!node || !node.$isLeafLike) return false;
    const parent = node.$parent;
    if (parent) {
      this._removeEdgeAndCheckNewFlap(node, parent);
    } else {
      const child = node.$children.$get();
      this._removeEdgeAndCheckNewFlap(node, child);
      this.$root = child;
      State.m.$rootChanged = true;
    }
    return true;
  }
  $setFlaps(flaps) {
    for (const flap of flaps) {
      const node = this._nodes[flap.id];
      const isLeaf = node && node.$isLeafLike;
      if (isLeaf) node.$setFlap(flap);
    }
  }
  $join(id) {
    const node = this._nodes[id];
    const parent = node.$parent;
    const child = node.$children.$get();
    const second = node.$children.$getSecond();
    this.$removeEdge(child.id, id);
    if (parent) {
      const length = child.$length + node.$length;
      this.$removeEdge(id, parent.id);
      this.$addEdge(child.id, parent.id, length);
    } else {
      const length = child.$length + second.$length;
      this.$removeEdge(second.id, id);
      this.$root = child;
      State.m.$rootChanged = true;
      this.$addEdge(second.id, child.id, length);
    }
    this.$flushRemove();
  }
  $split(newId, atId) {
    const node = this._nodes[atId];
    const parent = node.$parent;
    const l = node.$length;
    this.$removeEdge(atId, parent.id);
    this.$addEdge(parent.id, newId, Math.ceil(l / 2));
    this.$addEdge(newId, atId, Math.max(Math.floor(l / 2), 1));
    this.$flushRemove();
  }
  $merge(id) {
    const node = this._nodes[id];
    const parent = node.$parent;
    const children = [...node.$children];
    for (const child of children) {
      const length = child.$length;
      this.$removeEdge(id, child.id);
      this.$addEdge(child.id, parent.id, length);
    }
    this.$removeEdge(id, parent.id);
    this.$flushRemove();
  }
  $setLength(id, length) {
    const node = this._nodes[id];
    node.$length = length;
    node.$AABB.$setMargin(length);
    State.$lengthChanged.add(node);
    State.m.$treeStructureChanged = true;
    if (node.$isLeaf) {
      State.$nodeAABBChanged.add(node);
    }
  }
  /**
   * Connect two nodes. Node will be created if absent.
   * This is one of the two fundamental operations.
   *
   * @returns The first node.
   */
  $addEdge(n1, n2, length) {
    const N1 = this._nodes[n1] || this._addNode(n1);
    const N2 = this._nodes[n2] || this._addNode(n2);
    if (!N1.$parent && N1 !== this.$root) {
      N1.$pasteTo(N2);
      this.$setLength(n1, length);
    } else {
      N2.$pasteTo(N1);
      this.$setLength(n2, length);
    }
    UpdateResult.$edit([true, { n1, n2, length }]);
    return N1;
  }
  /**
   * Disconnect two nodes.
   * This is one of the two fundamental operations.
   *
   * This doesn't actually remove any node yet.
   * Must call {@link $flushRemove $flushRemove()} to perform the actual removal.
   */
  $removeEdge(n1, n2) {
    const N1 = this._nodes[n1], N2 = this._nodes[n2];
    const child = N1.$parent == N2 ? N1 : N2;
    UpdateResult.$edit([false, { n1, n2, length: child.$length }]);
    State.m.$treeStructureChanged = true;
    child.$cut();
    this._pendingRemove.add(n1);
    this._pendingRemove.add(n2);
  }
  /**
   * Check all {@link TreeNode}s in {@link _pendingRemove} and perform the actual removal.
   */
  $flushRemove() {
    if (this._pendingRemove.has(this.$root.id) && this.$root.$children.$size == 0) {
      this.$root = this._nodes.find((n) => n && !n.$parent && n.$children.$size > 0);
      State.m.$rootChanged = true;
    }
    for (const id of this._pendingRemove) {
      const node = this._nodes[id];
      if (node.$parent || node === this.$root) continue;
      State.$lengthChanged.delete(node);
      State.$parentChanged.delete(node);
      State.$childrenChanged.delete(node);
      State.$nodeAABBChanged.delete(node);
      delete this._nodes[id];
      UpdateResult.$removeNode(id);
    }
    this._pendingRemove.clear();
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _addNode(id, at, length) {
    return this._nodes[id] = new TreeNode(id, at, length);
  }
  _removeEdgeAndCheckNewFlap(node, partner) {
    this.$removeEdge(node.id, partner.id);
    if (partner.$isLeafLike) {
      State.$nodeAABBChanged.add(partner);
    }
  }
  /**
   * Setup an edge and returns if a new edge is created.
   * Used only during initialization.
   */
  _setEdge(n1, n2, length) {
    let N1 = this._nodes[n1];
    const N2 = this._nodes[n2];
    if (this.$root && !N1 && !N2) {
      console.warn(`Adding edge (${n1},${n2}) disconnects the graph.`);
      return false;
    }
    if (N1 && N2) {
      if (N1.$parent == N2) N1.$length = length;
      else if (N2.$parent == N1) N2.$length = length;
      else console.warn(`Adding edge (${n1},${n2}) will cause circuit.`);
      return false;
    }
    try {
      if (N2) {
        this._addNode(n1, N2, length);
      } else {
        if (!N1) this.$root = N1 = this._addNode(n1);
        this._addNode(n2, N1, length);
      }
      UpdateResult.$edit([true, { n1, n2, length }]);
      return true;
    } catch {
      return false;
    }
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/heap/heapSet.ts
var HeapSet = class extends BinaryHeap {
  constructor() {
    super(...arguments);
    /**
     * The set of elements currently in the heap.
     *
     * Here we only care about the presence or absence of elements,
     * and the performance of {@link WeakSet} will be better than {@link Set} in this case.
     */
    this._set = /* @__PURE__ */ new WeakSet();
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Interface methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  $insert(value) {
    if (this._set.has(value)) return;
    super.$insert(value);
    this._set.add(value);
  }
  $pop() {
    const result = super.$pop();
    if (result) this._set.delete(result);
    return result;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  $has(value) {
    return this._set.has(value);
  }
};

// ../bp-studio/box-pleating-studio/src/shared/utils/set.ts
function getFirst(set) {
  return set.values().next().value;
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/utils/climb.ts
function climb(updater5, ...sets) {
  const total = sets.reduce((v, s) => v + s.size, 0);
  if (total === 0) return;
  if (total === 1) {
    let n = getFirst(sets.find((s) => s.size === 1));
    while (updater5(n) && n.$parent) n = n.$parent;
  } else {
    const heap = new HeapSet(maxDistComparator);
    for (const set of sets) {
      for (const n of set) heap.$insert(n);
    }
    while (!heap.$isEmpty) {
      const n = heap.$pop();
      if (updater5(n) && n.$parent) heap.$insert(n.$parent);
    }
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/task.ts
var Task = class {
  /**
   * Note that the parameters are "the tasks depending on this task",
   * rather than "the tasks on which this task depends".
   *
   * The reason for this counter-intuitive design is that,
   * the importing mechanism of JavaScript will then automatically
   * import the downstream modules. If we use the other approach,
   * then we will have to import the last downstream module somewhere ourselves,
   * which is even more inconvenient.
   */
  constructor(action, ...deps) {
    this.$action = action;
    this.$priority = deps.length ? Math.max(...deps.map((d) => d.$priority)) + 1 : 0;
    this.$dependant = deps;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/types/geometry.ts
function same(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}
function leg(c, b) {
  return Math.sqrt(c * c - b * b);
}
function xyComparator(p1, p2) {
  return p1.x - p2.x || p1.y - p2.y;
}

// ../bp-studio/box-pleating-studio/src/core/math/invalidParameterError.ts
var InvalidParameterError = class extends Error {
  constructor() {
    super("Parameters are not valid");
    if (!("expect" in globalThis)) debugger;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/utils/gcd.ts
function gcd(a, b) {
  if (a == 0 && b == 0) return 1;
  if (a < 0) a = -a;
  if (b < 0) b = -b;
  while (a && b) {
    a %= b;
    if (a) b %= a;
  }
  return a ? a : b;
}
function reduceInt(a, b) {
  const g = gcd(a, b);
  return [a / g, b / g, g];
}

// ../bp-studio/box-pleating-studio/src/core/math/fraction.ts
var MAX_SAFE = 67108863;
var ERROR = 1e-10;
function toFraction(v, err) {
  return toFractionRecursive(v, 1, 0, err);
}
function toFractionRecursive(v, k2, k1, err) {
  const n = Math.floor(v), r = v - n, k0 = n * k1 + k2;
  const f = new Fraction(n);
  if (r / k0 / ((1 - r) * k0 + k1) < err) return f;
  else return toFractionRecursive(1 / r, k1, k0, err).i().a(f);
}
var Fraction = class _Fraction {
  static {
    this.ZERO = new _Fraction(0);
  }
  static {
    this.ONE = new _Fraction(1);
  }
  static {
    this.TWO = new _Fraction(2);
  }
  constructor(n, d = 1) {
    if (n instanceof _Fraction) {
      this._p = n._p;
      this._q = n._q * d;
    } else {
      if (Number.isSafeInteger(n) && Number.isSafeInteger(d)) {
        this._p = n;
        this._q = d;
      } else if (Number.isSafeInteger(Math.floor(n / d))) {
        const result = toFraction(n / d, ERROR);
        this._p = result._p;
        this._q = result._q;
      } else {
        throw new InvalidParameterError();
      }
    }
    this._normalize();
  }
  get $numerator() {
    return this._p;
  }
  get $denominator() {
    return this._q;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Core members
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** The value of the fraction as number */
  get $value() {
    return this._p / this._q;
  }
  /** Output the fraction in the format of `p/q` (in lowest terms), or just `p` if `q` equals 1. */
  toString() {
    this._smp();
    return this._p + (this._q > 1 ? "/" + this._q : "");
  }
  /** Clone */
  c() {
    return new _Fraction(this._p, this._q);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Single operation methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Simplification in place */
  _smp() {
    [this._p, this._q] = reduceInt(this._p, this._q);
  }
  /** Negation in place */
  n() {
    this._p = -this._p;
    return this;
  }
  /** Inversion in place */
  i() {
    const sgn = Math.sign(this._p);
    [this._p, this._q] = [sgn * this._q, sgn * this._p];
    return this;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Arithmetic methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Addition in place.
   *
   * Since v0.7.12, we optimize by reducing the denominators before addition
   * to prevent intermediate overflow during the common denominator calculation,
   * which may occur especially during matrix multiplications.
   */
  a(f) {
    const [q1, q2, g] = reduceInt(this._q, f._q);
    this._p = this._p * q2 + f._p * q1;
    this._q = q1 * q2 * g;
    return this._normalize();
  }
  /** Subtraction in place */
  s(f) {
    const [q1, q2, g] = reduceInt(this._q, f._q);
    this._p = this._p * q2 - f._p * q1;
    this._q = q1 * q2 * g;
    return this._normalize();
  }
  /** Multiplication in place */
  m(f) {
    this._p *= f._p;
    this._q *= f._q;
    return this._normalize();
  }
  /**
   * Division in place.
   * Must ensure that {@link f} is non-zero.
   */
  d(f) {
    const sgn = Math.sign(f._p);
    this._p *= sgn * f._q;
    this._q *= sgn * f._p;
    return this._normalize();
  }
  /** Change the sign of the fraction. */
  f(f) {
    this._p *= f;
    return this;
  }
  /** Whether this fraction is actually an integer. */
  get isIntegral() {
    this._smp();
    return this._q == 1;
  }
  /** Normalization after each operation */
  _normalize() {
    if (this._q > MAX_SAFE || Math.abs(this._p) > MAX_SAFE) this._smp();
    return this;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Methods that creates new object
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Negation to new instance */
  get neg() {
    return this.c().n();
  }
  /**
   * Inversion to new instance.
   * Must ensure that self is non-zero first.
   */
  get inv() {
    return this.c().i();
  }
  /** Addition to new instance */
  add(v) {
    return this.c().a(v);
  }
  /** Subtraction to new instance */
  sub(v) {
    return this.c().s(v);
  }
  /** Multiplication to new instance */
  mul(v) {
    return this.c().m(v);
  }
  /** Apply factor to new instance */
  fac(f) {
    return this.c().f(f);
  }
  /**
   * Division to new instance.
   * Must ensure that {@link v} is non-zero.
   */
  div(v) {
    return this.c().d(v);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Compare methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Equal to */
  eq(v) {
    return this._p * v._q == this._q * v._p;
  }
  /** Less than */
  lt(v) {
    return this._p * v._q < this._q * v._p;
  }
  /** Greater than */
  gt(v) {
    return this._p * v._q > this._q * v._p;
  }
  /** Less than or equal to */
  le(v) {
    return this._p * v._q <= this._q * v._p;
  }
  /** Greater than or equal to */
  ge(v) {
    return this._p * v._q >= this._q * v._p;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Other methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  $reduceWith(f) {
    this._smp();
    f._smp();
    const [n1, n2] = reduceInt(this._p, f._p);
    const [d1, d2] = reduceInt(this._q, f._q);
    return [new _Fraction(n1, d1), new _Fraction(n2, d2)];
  }
  $reduceToIntWith(f) {
    this._smp();
    f._smp();
    const [n1, n2] = reduceInt(this._p * f._q, this._q * f._p);
    return [new _Fraction(n1), new _Fraction(n2)];
  }
  toJSON() {
    return this.toString();
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/geometry/couple.ts
var Couple = class {
  /** Create a Couple object */
  constructor(x, y) {
    this._x = new Fraction(x);
    this._y = new Fraction(y);
  }
  get x() {
    return this._x.$value;
  }
  get y() {
    return this._y.$value;
  }
  // Specify `c` as type `this` will block all calling of this method
  // between different derived classes, which is the desired behavior
  eq(c) {
    if (!c) return false;
    return this._x.eq(c._x) && this._y.eq(c._y);
  }
  /** Print out the Couple in the "(x, y)" format */
  toString() {
    return "(" + this._x + ", " + this._y + ")";
  }
  $add(v) {
    return new this.constructor(this._x.add(v._x), this._y.add(v._y));
  }
  /** Convert self into an {@link IPoint}. */
  $toIPoint() {
    return { x: this.x, y: this.y };
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/geometry/vector.ts
var Vector = class _Vector extends Couple {
  static {
    /** The zero-vector. */
    this.ZERO = new _Vector(0, 0);
  }
  constructor(...p) {
    if (p.length == 1) super(p[0].x, p[0].y);
    else super(...p);
  }
  /** Returns the floating length of the vector. */
  get $length() {
    return Math.sqrt(this.$dot(this));
  }
  /**
   * Returns the slope in a non-zero {@link Fraction}.
   *
   * Must ensure that the current vector is NOT axis-parallel.
   */
  get $slope() {
    return this._y.div(this._x);
  }
  /** Rotate the vector 90-degrees in counter-clockwise direction. */
  $rotate90() {
    return new _Vector(this._y.neg, this._x);
  }
  /**
   * Return a vector of length 1 and of the same direction.
   *
   * It assumes that the current vector is an axis-parallel vector,
   * so that current length is in fact rational.
   */
  $normalize() {
    return this.$scale(new Fraction(this.$length).inv);
  }
  /** Scale and returns a new vector. */
  $scale(r) {
    return new _Vector(this._x.mul(r), this._y.mul(r));
  }
  /** Calculates the dot product of vectors. */
  $dot(v) {
    return this._x.mul(v._x).a(this._y.mul(v._y)).$value;
  }
  /** Take the negative value and returns a new vector. */
  get $neg() {
    return new _Vector(this._x.neg, this._y.neg);
  }
  /** Returns the principal argument of the vector in radians, in the range of (-PI/2, PI/2). */
  get $angle() {
    return Math.atan2(this.y, this.x);
  }
  /**
   * Reduce the vector, and return a new vector of the same direction,
   * but with denominators that are as small as possible.
   */
  $reduce() {
    return new _Vector(...this._x.$reduceWith(this._y));
  }
  /**
   * Reduce the vector, and return a new vector of the same direction,
   * but with integral components.
   *
   * The main use case for this method is to normalize the vectors
   * for testing equalities of {@link Pattern}s.
   *
   * Depending on the denominators of the original vector,
   * the new vector could be way longer than the original one.
   */
  $reduceToInt() {
    return new _Vector(...this._x.$reduceToIntWith(this._y));
  }
  /**
   * Double the principle argument and returns the new vector.
   *
   * Note that the length of the new vector may be different from the original length.
   */
  $doubleAngle() {
    const { _x, _y } = this.$reduce();
    return new _Vector(_x.mul(_x).s(_y.mul(_y)), Fraction.TWO.mul(_x).m(_y));
  }
  /** Check if the given vector is parallel to this one. */
  $parallel(v) {
    return this._x.mul(v._y).eq(this._y.mul(v._x));
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/geometry/point.ts
var Point = class _Point extends Couple {
  static {
    /** The origin. */
    this.ZERO = new _Point(0, 0);
  }
  constructor(...p) {
    if (p[0] instanceof Couple) super(p[0]._x, p[0]._y);
    else if (p.length == 1) super(p[0].x, p[0].y);
    else super(...p);
  }
  /** Distance to another {@link Point} */
  $dist(p) {
    return this.$sub(p).$length;
  }
  $sub(c) {
    if (c instanceof Vector) return new _Point(this._x.sub(c._x), this._y.sub(c._y));
    else return new Vector(this._x.sub(c._x), this._y.sub(c._y));
  }
  eq(p) {
    if (p instanceof _Point || !p) return super.eq(p);
    return this.x == p.x && this.y == p.y;
  }
  get $isIntegral() {
    return this._x.isIntegral && this._y.isIntegral;
  }
  /** Transform by the given orientation. */
  $transform(fx, fy) {
    return new _Point(this._x.fac(fx), this._y.fac(fy));
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  static $parseTest(p) {
    const match = p.match(/^\((-?\d+)(?:\/(\d+))?, (-?\d+)(?:\/(\d+))?\)$/);
    const x = new Fraction(Number(match[1]), Number(match[2] || 1));
    const y = new Fraction(Number(match[3]), Number(match[4] || 1));
    return new _Point(x, y);
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/core/math/geometry/matrix.ts
var Matrix = class _Matrix {
  /**
   * For performance, we do not clone the {@link Fraction}s again inside the constructor,
   * so make sure that the parameters are new instances already,
   * unless it is certain that the parameters will not mutate.
   */
  constructor(a, b, c, d, det) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    if (det) this._det = det;
    else this._det = this.a.mul(this.d).s(this.b.mul(this.c));
  }
  toString() {
    return [this.a, this.b, this.c, this.d].toString();
  }
  /// #if DEBUG
  toArray() {
    return [this.a.$value, this.b.$value, this.c.$value, this.d.$value];
  }
  /// #endif
  /**
   * Returns the inverse matrix in a new instance.
   * Returns `null` if the current matrix is not invertible.
   */
  get $inverse() {
    if (this._det.eq(Fraction.ZERO)) return null;
    return new _Matrix(
      this.d.div(this._det),
      this.b.neg.d(this._det),
      this.c.neg.d(this._det),
      this.a.div(this._det),
      this._det.inv
    );
  }
  $multiply(that) {
    return new that.constructor(
      this.a.mul(that._x).a(this.b.mul(that._y)),
      this.c.mul(that._x).a(this.d.mul(that._y))
    );
  }
  /**
   * Find the scaling-rotational matrix that transforms `from` to `to`.
   * It is assumed that the parameters are non-zero vectors.
   */
  static $getTransformMatrix(from, to) {
    const M = new _Matrix(from._x, from._y.neg, from._y, from._x);
    const { _x: a, _y: b } = M.$inverse.$multiply(to);
    return new _Matrix(a, b.neg, b, a);
  }
};

// ../bp-studio/box-pleating-studio/src/shared/utils/map.ts
function getOrSetEmptyArray(map, key, callBack) {
  let result = map.get(key);
  if (result === void 0) {
    map.set(key, result = []);
    if (callBack) callBack(result);
  }
  return result;
}

// ../bp-studio/box-pleating-studio/src/core/math/geometry/line.ts
function int(x, f) {
  return f > 0 ? Math.ceil(x) : Math.floor(x);
}
var Line = class _Line {
  static $fromIPoint(p1, p2) {
    return new _Line(new Point(p1), new Point(p2));
  }
  /** Remove duplicates and return a new array of lines. */
  static $distinct(lines) {
    const signatures = /* @__PURE__ */ new Set();
    return lines.filter((l) => {
      const signature = l.toString(), ok = !signatures.has(signature);
      if (ok) signatures.add(signature);
      return ok;
    });
  }
  /** Remove all overlapping parts with line set l2 from line set l1. */
  static $subtract(l1, l2) {
    const result = [];
    const slopeMap = /* @__PURE__ */ new Map();
    for (const l of l2) {
      const slope = l.$slope;
      getOrSetEmptyArray(slopeMap, slope).push(l);
    }
    for (const l of l1) {
      const slope = l.$slope;
      if (!slopeMap.has(slope)) result.push(l);
      else result.push(...l._cancel(slopeMap.get(slope)));
    }
    return result;
  }
  constructor(p, c) {
    if (c instanceof Vector) c = p.$add(c);
    this.p1 = p;
    this.p2 = c;
  }
  get $isDegenerated() {
    return this.p1.eq(this.p2);
  }
  get $vector() {
    return this.p2.$sub(this.p1);
  }
  /** Returns the slope (could be {@link Number.POSITIVE_INFINITY}). */
  get $slope() {
    const dx = this.p1._x.sub(this.p2._x);
    if (dx.$numerator == 0) return Number.POSITIVE_INFINITY;
    return this.p1._y.sub(this.p2._y).d(dx).$value;
  }
  /**
   * Output the line in the form of `(x1, y1),(x2, y2)` with sorted endpoints.
   * Could be used as a signature.
   */
  toString() {
    return [this.p1, this.p2].sort().toString();
  }
  $toILine() {
    return [this.p1.$toIPoint(), this.p2.$toIPoint()];
  }
  /** Check if two line segments are identical. */
  eq(l) {
    return this.p1.eq(l.p1) && this.p2.eq(l.p2) || this.p1.eq(l.p2) && this.p2.eq(l.p1);
  }
  /** Return a clone of the current {@link Line}, but in opposite direction. */
  $reverse() {
    return new _Line(this.p2, this.p1);
  }
  $pointIsOnRight(point, allowEq = false) {
    const v = point.$sub(this.p1).$rotate90();
    const dot = v.$dot(this.$vector);
    return dot > 0 || allowEq && dot == 0;
  }
  /**
   * Whether a given point is in this line segment
   * (endpoints are not included by default).
   */
  $contains(p, includeEndpoints = false) {
    if (includeEndpoints && (p.eq(this.p1) || p.eq(this.p2))) return true;
    const v1 = p.$sub(this.p1), v2 = p.$sub(this.p2);
    return v1._x.mul(v2._y).eq(v2._x.mul(v1._y)) && v1.$dot(v2) < 0;
  }
  $lineContains(p) {
    return this.$vector.$parallel(p.$sub(this.p1));
  }
  /**
   * Return the intersection of this line segment (endpoints included)
   * with the given line segment (or straight line).
   */
  $intersectLine(l, asSegment = true) {
    const intersection2 = getIntersection(this, l.p1, l.$vector, asSegment, asSegment);
    return intersection2 && intersection2.point;
  }
  /**
   * Return the intersection of this line (as segment, endpoints included)
   * with the given direction (as a straight line, unless {@link headless} or {@link tailless} is assigned).
   */
  $intersection(p, v, headless, tailless) {
    const intersection2 = getIntersection(this, p, v, headless, tailless);
    return intersection2 && intersection2.point;
  }
  /** Transform the line by the given orientation and return a new line. */
  $transform(fx, fy) {
    return new _Line(this.p1.$transform(fx, fy), this.p2.$transform(fx, fy));
  }
  /** Move the line by the given {@link Vector} and return a new line. */
  $add(v) {
    return new _Line(this.p1.$add(v), this.p2.$add(v));
  }
  /** Sort the endpoints by the x-coordinates and returns. */
  $xOrient() {
    if (this.p1._x.gt(this.p2._x)) return [this.p2, this.p1];
    return [this.p1, this.p2];
  }
  /** Return all grid points that are on this line. */
  $gridPoints() {
    const result = [];
    const { p1, p2 } = this;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    if (Math.abs(dx) < Math.abs(dy)) {
      const f = Math.sign(dx);
      for (let x = int(p1.x, f); x * f <= p2.x * f; x += f) {
        const p = this.$xIntersection(x);
        if (p.$isIntegral) result.push(p);
      }
    } else {
      const f = Math.sign(dy);
      for (let y = int(p1.y, f); y * f <= p2.y * f; y += f) {
        const p = this.$yIntersection(y);
        if (p.$isIntegral) result.push(p);
      }
    }
    return result;
  }
  $xIntersection(x) {
    const v = this.p2.$sub(this.p1);
    const f = new Fraction(x);
    return new Point(f, this.p1._y.sub(v.$slope.m(this.p1._x.sub(f))));
  }
  $yIntersection(y) {
    const v = this.p2.$sub(this.p1);
    const f = new Fraction(y);
    return new Point(this.p1._x.sub(this.p1._y.sub(f).d(v.$slope)), f);
  }
  /**
   * Reflect the given {@link Vector} against this line.
   *
   * Note that the length of the resulting vector has no significance.
   */
  $reflect(v) {
    const m = new Matrix(v._x.neg, v._y.c(), v._y.neg, v._x.neg);
    const mi = m.$inverse;
    const lineVector = this.p2.$sub(this.p1);
    const rotated = mi.$multiply(lineVector);
    const doubled = rotated.$doubleAngle();
    return m.$multiply(doubled).$reduce();
  }
  /** Whether the line is perpendicular to the given {@link Vector}. */
  $perpendicular(v) {
    return this.$vector.$dot(v) == 0;
  }
  /** Shift by the given {@link Vector} and return a new {@link Line}. */
  $shift(v) {
    return new _Line(this.p1.$add(v), this.p2.$add(v));
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Removes part of the current line that overlaps any passed-in lines,
   * and returns the remaining parts.
   */
  _cancel(set) {
    let result = [this];
    for (const l2 of set) {
      const next = [];
      for (const l1 of result) next.push(...l1._cancelCore(l2));
      result = next;
    }
    return result;
  }
  *_cancelCore(l) {
    const a = this.$contains(l.p1, true), b = this.$contains(l.p2, true);
    const c = l.$contains(this.p1, true), d = l.$contains(this.p2, true);
    if (c && d) return;
    if (!a && !b) {
      yield this;
    } else if (a && b) {
      const l11 = new _Line(this.p1, l.p1), l12 = new _Line(this.p1, l.p2);
      const l21 = new _Line(this.p2, l.p1), l22 = new _Line(this.p2, l.p2);
      if (l11.$isDegenerated) {
        yield l22;
      } else if (l12.$isDegenerated) {
        yield l21;
      } else if (l21.$isDegenerated) {
        yield l12;
      } else if (l22.$isDegenerated) {
        yield l11;
      } else if (l11.$contains(l.p2)) {
        yield l12;
        yield l21;
      } else {
        yield l11;
        yield l22;
      }
    } else {
      const p1 = a ? l.p1 : l.p2;
      const p2 = d ? this.p1 : this.p2;
      if (!p1.eq(p2)) yield new _Line(p1, p2);
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  /* istanbul ignore next: debug */
  static $parseTest(jsons) {
    return jsons.map((j) => {
      const l = j;
      const line = new _Line(Point.$parseTest(l.p1), Point.$parseTest(l.p2));
      const r = line;
      if ("type" in j) r.type = j.type;
      if ("p0" in j) r.p0 = Point.$parseTest(l.p0);
      return line;
    });
  }
  /// #endif
};
function getIntersection(line, p, v, headless = false, tailless = false, targetAsRay = false) {
  const v1 = line.p2.$sub(line.p1);
  const m = new Matrix(v1._x, v._x, v1._y, v._y).$inverse;
  if (m == null) return null;
  const r = m.$multiply(new Point(p.$sub(line.p1)));
  const a = r._x, b = r._y.neg;
  if (a.lt(Fraction.ZERO) || !targetAsRay && a.gt(Fraction.ONE)) return null;
  if (headless && b.lt(Fraction.ZERO)) return null;
  if (tailless && b.gt(Fraction.ONE)) return null;
  return {
    line,
    point: p.$add(v.$scale(b)),
    dist: b
  };
}

// ../bp-studio/box-pleating-studio/src/shared/utils/array.ts
function createArray(length, value) {
  return Array.from({ length }, (_) => value);
}
function foreachPair(array, action) {
  const l = array.length;
  for (let i = 0; i < l; i++) {
    for (let j = i + 1; j < l; j++) {
      action(array[i], array[j]);
    }
  }
}
function distinct(array) {
  const result = [];
  for (const item of array) {
    if (result.length === 0 || item !== result[result.length - 1]) {
      result.push(item);
    }
  }
  return result;
}
function rotate(array, j) {
  array.push(...array.splice(0, j));
  return array;
}

// ../bp-studio/box-pleating-studio/src/core/math/geometry/rationalPath.ts
function toRationalPath(path) {
  const result = path.map((p) => new Point(p));
  result.isHole = path.isHole;
  result.leaves = path.leaves;
  return result;
}
function toPath(path) {
  const result = path.map((p) => p.$toIPoint());
  result.isHole = path.isHole;
  return result;
}
function toLines(path) {
  return path.map((p, i) => new Line(p, path[i + 1] || path[0]));
}
function triangleTransform(triangle, to) {
  const [p1, p2, p3] = triangle;
  const [v1, v2, v3] = [to, p2, p3].map((p) => p.$sub(p1));
  if (v2.eq(Vector.ZERO) || v1.eq(Vector.ZERO)) return null;
  const m = Matrix.$getTransformMatrix(v2, v1);
  return p1.$add(m.$multiply(v3));
}
function join(p1, p2) {
  p1 = p1.concat();
  p2 = p2.concat();
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      if (p1[i].eq(p2[j])) {
        rotate(p2, j);
        p1.splice(i, 2, ...p2);
        return p1;
      }
    }
  }
  return p1;
}
function shift(path, v) {
  return path.map((p) => p.$add(v));
}

// ../bp-studio/box-pleating-studio/src/core/math/geometry/path.ts
function getCornerDirection(prev, next) {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  return (dx * dy < 0 ? 0 : 1) + (dx < 0 ? 0 : 2);
}
function mapDirections(path) {
  const l = path.length;
  const result = [];
  for (let i = 0, j = l - 1; i < l; j = i++) {
    result.push(getCornerDirection(path[j], path[i + 1] || path[0]));
  }
  return result;
}
function deduplicate(path) {
  const l = path.length;
  const result = [];
  for (let i = 0, j = l - 1; i < l; j = i++) {
    const prev = path[j], p = path[i];
    if (prev.x != p.x || prev.y != p.y) result.push(path[i]);
  }
  return result;
}
function pathToString(path) {
  return path.map((p) => pointToString(p)).join(",");
}
function pointToString(p) {
  if (p.arc) return `(${p.x},${p.y},${p.arc.x},${p.arc.y},${p.r})`;
  return `(${p.x},${p.y})`;
}
function isClockwise(path) {
  const l = path.length;
  let minX = Number.POSITIVE_INFINITY, minXDelta = 0;
  for (let i = 0, j = l - 1; i < l; j = i++) {
    const p = path[i];
    if (p.x < minX) {
      minX = p.x;
      const p1 = path[j], p2 = path[i + 1] || path[0];
      const dx = p2.y - p1.y;
      minXDelta = dx;
    }
  }
  return minXDelta > 0;
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/intersector.ts
var Intersector = class {
  constructor() {
    /** Whether there is a new event being inserted to the front of the event queue. */
    this._eventInserted = false;
  }
  $setup(provider, queue) {
    this._provider = provider;
    this._queue = queue;
  }
  /** Process possible intersections, and returns if there is an insertion. */
  $process(prev, ev, next) {
    this._currentStart = ev;
    this._eventInserted = false;
    this.$possibleIntersection(prev, ev);
    this.$possibleIntersection(ev, next);
    return this._eventInserted;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Subdivide a segment at the given point, and returns the {@link StartEvent} of the second segment.
   *
   * Given a segment [A--B] being split at point P, this produces:
   * - [A--P] (the original event, with its end redirected to a new EndEvent at P)
   * - [P--B] (a new StartEvent at P, linked to the original EndEvent at B)
   *
   * Both the new StartEvent and the new EndEvent are inserted into the event queue.
   *
   * If a neighbor segment (not the currently processed one) gets subdivided and
   * the new events fall before the current event in the queue, we set
   * {@link _eventInserted} so that {@link DivideAndCollect._processStart} knows
   * to re-queue the current event and process the newly inserted ones first.
   */
  _subdivide(event, point) {
    const provider = this._provider;
    const segment = event.$segment;
    const newSegment = segment.$subdivide(point, event.$point === segment.$start);
    const end = event.$other;
    const newStart = provider.$createStart(point, newSegment, event.$wrapDelta);
    newStart.$other = end;
    end.$other = newStart;
    this._queue.$insert(newStart);
    const newEnd = provider.$createEnd(point, segment);
    newEnd.$other = event;
    event.$other = newEnd;
    this._queue.$insert(newEnd);
    if (event != this._currentStart && !this._eventInserted) {
      this._eventInserted ||= provider.$eventComparator(this._currentStart, newStart) > 0 || provider.$eventComparator(this._currentStart, newEnd) > 0;
    }
    return newStart;
  }
  /** Processing AA segments. This is used in derived classes. */
  _processAALineSegments(ev1, ev2) {
    const seg1 = ev1.$segment;
    const seg2 = ev2.$segment;
    if (seg1.$isHorizontal != seg2.$isHorizontal) {
      const h = seg1.$isHorizontal ? ev1 : ev2;
      const v = seg1.$isHorizontal ? ev2 : ev1;
      const x = v.$point.x, y = h.$point.y;
      const hx1 = h.$point.x, hx2 = h.$other.$point.x;
      const vy1 = v.$point.y, vy2 = v.$other.$point.y;
      if (hx1 < x && x < hx2 && vy1 <= y && y <= vy2) this._subdivide(h, { x, y });
      if (vy1 < y && y < vy2 && hx1 <= x && x <= hx2) this._subdivide(v, { x, y });
    } else {
      this._processOverlap(ev1, ev2, seg1.$isHorizontal);
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Process the case where the two line segment overlaps. */
  _processOverlap(ev1, ev2, isHorizontal) {
    const { x: x1, y: y1 } = ev1.$point;
    const p2 = ev1.$other.$point, { x: x2, y: y2 } = p2;
    const p3 = ev2.$point, { x: x3, y: y3 } = p3;
    const p4 = ev2.$other.$point, { x: x4, y: y4 } = p4;
    if (isHorizontal && y1 === y3) {
      if (x1 < x3 && x3 < x2) ev1 = this._subdivide(ev1, p3);
      if (x1 < x4 && x4 < x2) this._subdivide(ev1, p4);
      else if (x3 < x2 && x2 < x4) this._subdivide(ev2, p2);
    } else if (!isHorizontal && x1 === x3) {
      if (y1 < y3 && y3 < y2) ev1 = this._subdivide(ev1, p3);
      if (y1 < y4 && y4 < y2) this._subdivide(ev1, p4);
      else if (y3 < y2 && y2 < y4) this._subdivide(ev2, p2);
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/geometry/float.ts
var EPSILON = 1e-10;
function isAlmostZero(x, eps = EPSILON) {
  return Math.abs(x) < eps;
}
function epsilonSame(p1, p2, eps = EPSILON) {
  return isAlmostZero(p1.x - p2.x, eps) && isAlmostZero(p1.y - p2.y, eps);
}
function fixZero(x) {
  if (isAlmostZero(x)) return 0;
  return x;
}
var floatXyComparator = (a, b) => fixZero(a.x - b.x) || fixZero(a.y - b.y);
function fixFloat(x) {
  const rx = Math.round(x);
  return isAlmostZero(rx - x) ? rx : x;
}
function fixIPoint(p) {
  let { x, y } = p;
  const intX = Number.isInteger(x), intY = Number.isInteger(y);
  if (intX && intY) return p;
  if (!intX) x = fixFloat(x);
  if (!intY) y = fixFloat(y);
  return { x, y };
}
function fixPath(path) {
  return path.map(fixIPoint);
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/generalUnion/generalIntersector.ts
var RELAXED_EPSILON = 1e-9;
var GeneralIntersector = class extends Intersector {
  $possibleIntersection(ev1, ev2) {
    if (!ev1 || !ev2) return;
    const seg1 = ev1.$segment;
    const seg2 = ev2.$segment;
    const [a1, b1, c1] = seg1.$coefficients, [a2, b2, c2] = seg2.$coefficients;
    const detAB = a1 * b2 - a2 * b1;
    const detBC = b1 * c2 - b2 * c1;
    if (isAlmostZero(detAB)) {
      if (!isAlmostZero(detBC, RELAXED_EPSILON)) return;
      const p2 = ev1.$other.$point;
      const p3 = ev2.$point, p4 = ev2.$other.$point;
      if (seg1.$containsPtOnLine(p3, false)) ev1 = this._subdivide(ev1, p3);
      if (seg1.$containsPtOnLine(p4, false)) this._subdivide(ev1, p4);
      if (seg2.$containsPtOnLine(p2, false)) this._subdivide(ev2, p2);
    } else {
      const pt = { x: detBC / detAB, y: (a2 * c1 - a1 * c2) / detAB };
      this._crossIntersection(ev1, ev2, pt);
    }
  }
  /** This method is overwritten in {@link OverlapIntersector}. */
  _crossIntersection(ev1, ev2, pt) {
    const seg1 = ev1.$segment;
    const seg2 = ev2.$segment;
    if (seg1.$containsPtOnLine(pt, false) && seg2.$containsPtOnLine(pt, true)) this._subdivide(ev1, pt);
    if (seg2.$containsPtOnLine(pt, false) && seg1.$containsPtOnLine(pt, true)) this._subdivide(ev2, pt);
  }
  _subdivide(event, point) {
    if (epsilonSame(point, event.$point, RELAXED_EPSILON) || epsilonSame(point, event.$other.$point, RELAXED_EPSILON)) {
      return event;
    }
    return super._subdivide(event, point);
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/segment/lineSegment.ts
var LineSegment = class _LineSegment {
  constructor(start, end, polygon = 0, type = 0 /* None */) {
    this.$start = start;
    this.$end = end;
    this.$type = type;
    this.$polygon = polygon;
    this.$coefficients = [
      end.y - start.y,
      start.x - end.x,
      start.y * end.x - start.x * end.y
    ];
    this._isHorizontal = isAlmostZero(this.$coefficients[0]);
    this._isVertical = isAlmostZero(this.$coefficients[1]);
  }
  /**
   * If the given point (already known to be on the line)
   * is in the interior of this line segment.
   */
  $containsPtOnLine(point, endPoints) {
    const threshold = endPoints ? EPSILON : -EPSILON;
    return !this._isVertical && (point.x - this.$start.x) * (point.x - this.$end.x) < threshold || !this._isHorizontal && (point.y - this.$start.y) * (point.y - this.$end.y) < threshold;
  }
  $subdivide(point, oriented) {
    let newSegment;
    if (oriented) {
      newSegment = new _LineSegment(point, this.$end, this.$polygon, this.$type);
      this.$end = point;
    } else {
      newSegment = new _LineSegment(this.$start, point, this.$polygon, this.$type);
      this.$start = point;
    }
    return newSegment;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/eventProvider.ts
var EventProvider = class {
  constructor() {
    /** The next available id for the events. */
    this._nextId = 0;
  }
  $reset() {
    this._nextId = 0;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/event/eventBase.ts
var EventBase = class {
  constructor(point, isStart, key) {
    this.$point = point;
    this.$isStart = isStart;
    this.$key = key;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/event/endEvent.ts
var EndEvent = class extends EventBase {
  constructor(point, key) {
    super(point, 0, key);
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/event/startEvent.ts
var StartEvent = class extends EventBase {
  constructor(point, segment, delta, key) {
    super(point, 1, key);
    /**
     * Whether this segment is in the interior of the union.
     *
     * Its initial value is `false`, while its actual value
     * will de determined during the course of the algorithm.
     */
    this.$isInside = false;
    this.$segment = segment;
    this.$wrapDelta = delta;
    this.$wrapCount = delta;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/generalUnion/generalComparators.ts
function eventComparator(comparator) {
  return (a, b) => floatXyComparator(a.$point, b.$point) || // End events are prioritized for the events at the same location.
  a.$isStart - b.$isStart || a.$isStart && (segmentComparator(a, b) || comparator(a, b)) || a.$key - b.$key;
}
function statusComparator(comparator) {
  return (a, b) => compareUpDown(a, b) || segmentComparator(a, b) || comparator(a, b) || a.$key - b.$key;
}
var segmentComparator = (a, b) => (
  // The one with the smaller tangent slope goes first (be aware of floating error)
  fixZero(getEventSlope(a) - getEventSlope(b)) || // Borders go before creases
  a.$segment.$type - b.$segment.$type
);
var exitFirstComparator = (a, b) => a.$wrapDelta - b.$wrapDelta;
var enterFirstComparator = (a, b) => b.$wrapDelta - a.$wrapDelta;
function compareUpDown(a, b) {
  const ax = a.$point.x, bx = b.$point.x;
  if (isAlmostZero(ax - bx)) return fixZero(a.$point.y - b.$point.y);
  if (ax < bx) return fixZero(getEventSlope(a) - getSlope(a.$point, b.$point));
  return fixZero(getSlope(a.$point, b.$point) - getEventSlope(b));
}
function getEventSlope(e) {
  return getSlope(e.$point, e.$other.$point);
}
function getSlope(p1, p2) {
  const dx = p1.x - p2.x;
  if (isAlmostZero(dx)) return Number.POSITIVE_INFINITY;
  return (p1.y - p2.y) / dx;
}
var EventComparator = {
  exit: eventComparator(exitFirstComparator),
  enter: eventComparator(enterFirstComparator)
};
var StatusComparator = {
  exit: statusComparator(exitFirstComparator),
  enter: statusComparator(enterFirstComparator)
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/generalUnion/generalEventProvider.ts
var GeneralEventProvider = class extends EventProvider {
  constructor(exitFirst) {
    super();
    this.$eventComparator = exitFirst ? EventComparator.exit : EventComparator.enter;
    this.$statusComparator = exitFirst ? StatusComparator.exit : StatusComparator.enter;
  }
  $createStart(startPoint, segment, delta) {
    return new StartEvent(startPoint, segment, delta, this._nextId++);
  }
  $createEnd(endPoint, segment) {
    return new EndEvent(endPoint, this._nextId++);
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/bst/binarySearchTree.ts
var BinarySearchTree = class {
  constructor(comparator, nil) {
    this._comparator = comparator;
    this._root = this._lastQueriedNode = this._nil = nil;
  }
  $get(key) {
    return this._getNode(key).$value;
  }
  get $isEmpty() {
    return this._root === this._nil;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _getNode(key) {
    if (this._lastQueriedNode.$key === key) return this._lastQueriedNode;
    return this._lastQueriedNode = this._getNodeCore(key);
  }
  _getNodeCore(key) {
    let n = this._root;
    while (n !== this._nil) {
      const compare2 = this._comparator(n.$key, key);
      if (compare2 === 0) {
        break;
      } else if (compare2 < 0) {
        n = n.$right;
      } else {
        n = n.$left;
      }
    }
    return n;
  }
  /**
   * Right rotation:
   *     4        2
   *    / \      / \
   *   2   5 => 1   4
   *  / \          / \
   * 1   3        3   5
   */
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  _rotateRight(n) {
    const x = n.$left;
    n.$left = x.$right;
    x.$right = n;
    return x;
  }
  /**
   * Left rotation:
   *   2          4
   *  / \        / \
   * 1   4  =>  2   5
   *    / \    / \
   *   3   5  1   3
   */
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  _rotateLeft(n) {
    const x = n.$right;
    n.$right = x.$left;
    x.$left = n;
    return x;
  }
  /** Find the minimal descendant */
  _min(n) {
    while (n.$left !== this._nil) n = n.$left;
    return n;
  }
  /** Find the maximal descendant */
  _max(n) {
    while (n.$right !== this._nil) n = n.$right;
    return n;
  }
  /** Replace key/value of a node by those of another node, and return the latter */
  _replaceKeyValue(n, by) {
    n.$value = by.$value;
    n.$key = by.$key;
    if (this._lastQueriedNode === by) this._lastQueriedNode = n;
    return by;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/bst/parentedTree.ts
var ParentedTree = class extends BinarySearchTree {
  $getPrev(key) {
    let node = this._getNode(key);
    if (node === this._nil) {
      debugger;
    }
    if (node.$left !== this._nil) return this._max(node.$left).$value;
    while (node.$parent !== this._nil && node.$parent.$left === node) node = node.$parent;
    return node.$parent.$value;
  }
  $getNext(key) {
    let node = this._getNode(key);
    if (node.$right !== this._nil) return this._min(node.$right).$value;
    while (node.$parent !== this._nil && node.$parent.$right === node) node = node.$parent;
    return node.$parent.$value;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _rotateRight(n) {
    const parent = n.$parent;
    const x = super._rotateRight(n);
    this._replaceChild(parent, n, x);
    n.$parent = x;
    n.$left.$parent = n;
    return x;
  }
  _rotateLeft(n) {
    const parent = n.$parent;
    const x = super._rotateLeft(n);
    this._replaceChild(parent, n, x);
    n.$parent = x;
    n.$right.$parent = n;
    return x;
  }
  _replaceChild(parent, oldChild, newChild) {
    if (parent === this._nil) {
      this._root = newChild;
    } else if (parent.$left === oldChild) {
      parent.$left = newChild;
    } else {
      parent.$right = newChild;
    }
    newChild.$parent = parent;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/bst/ravlTree.ts
var NIL = { $rank: -1 };
var RavlTree = class extends ParentedTree {
  constructor(comparator) {
    super(comparator, NIL);
  }
  $insert(key, value) {
    let parent = this._nil;
    let n = this._root;
    let compare2 = 0;
    while (n !== this._nil) {
      parent = n;
      compare2 = this._comparator(n.$key, key);
      if (compare2 === 0) {
        n.$value = value;
        return this._lastQueriedNode = n;
      } else if (compare2 < 0) {
        n = n.$right;
      } else {
        n = n.$left;
      }
    }
    const newNode = {
      $key: key,
      $value: value,
      $rank: 0,
      $parent: parent,
      $right: this._nil,
      $left: this._nil
    };
    if (parent === this._nil) {
      this._root = newNode;
    } else if (compare2 > 0) {
      parent.$left = newNode;
    } else {
      parent.$right = newNode;
    }
    this._fixInsert(newNode);
    return this._lastQueriedNode = newNode;
  }
  $delete(key) {
    let n;
    if (this._lastQueriedNode.$key === key) {
      n = this._lastQueriedNode;
      this._lastQueriedNode = this._nil;
    } else {
      n = this._getNodeCore(key);
      if (n === this._nil) return;
    }
    if (n.$left !== this._nil && n.$right !== this._nil) {
      const next = this._min(n.$right);
      n = this._replaceKeyValue(n, next);
    }
    const moveUp = n.$left === this._nil ? n.$right : n.$left;
    this._replaceChild(n.$parent, n, moveUp);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _fixInsert(x) {
    while (x.$parent !== this._nil && _is01Node(x.$parent)) {
      x.$parent.$rank++;
      x = x.$parent;
    }
    const y = x.$parent;
    if (y === this._nil) return;
    if (x === y.$left) {
      const z = x.$right;
      if (z === this._nil || x.$rank === z.$rank + 2) {
        this._rotateRight(y);
      } else {
        this._doubleRotateRight(x, y, z);
        z.$rank++;
        x.$rank--;
      }
    } else {
      const z = x.$left;
      if (z === this._nil || x.$rank === z.$rank + 2) {
        this._rotateLeft(y);
      } else {
        this._doubleRotateLeft(x, y, z);
        z.$rank++;
        x.$rank--;
      }
    }
    y.$rank--;
  }
  _doubleRotateRight(x, y, z) {
    this._replaceChild(y.$parent, y, z);
    x.$right = z.$left;
    z.$left.$parent = x;
    y.$left = z.$right;
    z.$right.$parent = y;
    z.$left = x;
    x.$parent = z;
    z.$right = y;
    y.$parent = z;
  }
  _doubleRotateLeft(x, y, z) {
    this._replaceChild(y.$parent, y, z);
    x.$left = z.$right;
    z.$right.$parent = x;
    y.$right = z.$left;
    z.$left.$parent = y;
    z.$right = x;
    x.$parent = z;
    z.$left = y;
    y.$parent = z;
  }
};
function _is01Node(node) {
  return node.$rank === node.$left.$rank && node.$rank === node.$right.$rank + 1 || node.$rank === node.$right.$rank && node.$rank === node.$left.$rank + 1;
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/sweepLine.ts
var SweepLine = class {
  constructor(provider) {
    this._provider = provider;
    this._eventQueue = new BinaryHeap(provider.$eventComparator);
    this._status = new RavlTree(provider.$statusComparator);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Reset the state of self (for reusing instance). */
  _reset() {
    this._provider.$reset();
  }
  /** The main routine of the sweep line algorithm. */
  _sweep() {
    while (!this._eventQueue.$isEmpty) {
      const event = this._eventQueue.$pop();
      if (!event.$isStart) this._processEnd(event);
      else this._processStart(event);
    }
  }
  /**
   * Add an {@link ISegment} during initialization.
   * @param segment The segment itself.
   * @param isEntering Whether this segment is entering its corresponding polygon.
   */
  _addSegment(segment, delta) {
    if (same(segment.$start, segment.$end)) return;
    const [startPoint, endPoint] = this._orientation(segment, delta) ? [segment.$start, segment.$end] : [segment.$end, segment.$start];
    const startEvent = this._provider.$createStart(startPoint, segment, delta);
    const endEvent = this._provider.$createEnd(endPoint, segment);
    endEvent.$other = startEvent;
    startEvent.$other = endEvent;
    this._eventQueue.$insert(startEvent);
    this._eventQueue.$insert(endEvent);
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/divideAndCollect.ts
var DivideAndCollect = class extends SweepLine {
  constructor(provider, intersector) {
    super(provider);
    /** The {@link ISegment}s we collected during the course. */
    this._collectedSegments = [];
    intersector.$setup(provider, this._eventQueue);
    this._intersector = intersector;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _reset() {
    super._reset();
    this._collectedSegments.length = 0;
  }
  _processStart(event) {
    this._status.$insert(event, event);
    const prev = this._status.$getPrev(event);
    const next = this._status.$getNext(event);
    const inserted = this._intersector.$process(prev, event, next);
    if (!inserted) {
      this._setInsideFlag(event, prev);
    } else {
      this._eventQueue.$insert(event);
    }
  }
  _processEnd(event) {
    const start = this._endProcessor(event, this._status, this._intersector);
    if (start.$isInside === this._shouldPickInside) this._collectedSegments.push(start.$segment);
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/orientation.ts
var deltaOrientation = function(segment, delta) {
  return delta === 1;
};
var compareOrientation = function(segment, delta) {
  return xyComparator(segment.$start, segment.$end) < 0;
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/polyBool.ts
var PolyBool = class extends DivideAndCollect {
  constructor() {
    super(...arguments);
    this._orientation = deltaOrientation;
  }
  /** Generates the polygons of interest. */
  $get(...components) {
    this._reset();
    this._initialize(components);
    this._sweep();
    return this._chainer.$chain(this._collectedSegments);
  }
  _setInsideFlag(event, prev) {
    if (prev && prev.$wrapCount != 0) {
      event.$wrapCount += prev.$wrapCount;
      event.$isInside = event.$wrapCount != 0;
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  /* istanbul ignore next: debug */
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  createTestCase(components) {
    console.log(components.map((c) => "[" + c.map((p) => `parsePath("${pathToString(p)}")`).join(",") + "]").join(",\n"));
  }
  /* istanbul ignore next: debug */
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  debugWrap(event) {
    let cursor = event;
    while (cursor) {
      console.log(
        cursor.$segment.$polygon,
        pointToString(cursor.$point),
        pointToString(cursor.$other.$point),
        cursor.$isInside,
        cursor.$wrapCount
      );
      cursor = cursor.$prev;
    }
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/endProcessor.ts
var simpleEndProcessor = function(event, status) {
  const start = event.$other;
  status.$delete(start);
  return start;
};
var generalEndProcessor = function(event, status, intersector) {
  const start = event.$other;
  const prev = status.$getPrev(start);
  const next = status.$getNext(start);
  status.$delete(start);
  intersector.$possibleIntersection(prev, next);
  return start;
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/unionBase.ts
var UnionBase = class extends PolyBool {
  constructor() {
    super(...arguments);
    this._endProcessor = simpleEndProcessor;
    this._shouldPickInside = false;
  }
  $get(...components) {
    const result = super.$get(...components);
    result.forEach((path) => path.isHole = isClockwise(path));
    return result;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _initialize(components) {
    this._initializer.$init(components, (segment, delta) => this._addSegment(segment, delta));
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/initializer.ts
var Initializer = class {
  constructor(lineConstructor, comparator) {
    this._constructor = lineConstructor;
    this._comparator = comparator;
  }
  $init(components, callback) {
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      for (const path of c) {
        for (let j = 0; j < path.length; j++) {
          const p1 = path[j], p2 = path[(j + 1) % path.length];
          const segment = new this._constructor(p1, p2, i);
          const entering = this._comparator(p1, p2) < 0;
          callback(segment, entering ? 1 : -1);
        }
      }
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/chainer/chainer.ts
var INITIAL_CHAIN_SIZE = 10;
var Chainer = class {
  constructor() {
    this.$checkFunction = same;
    this._length = 0;
    this._chains = 0;
  }
  $chain(segments) {
    this._reset(segments.length + 1);
    const result = [];
    for (const segment of segments) {
      const tail = this._findChain(this._chainHeads, segment.$end);
      const head = this._findChain(this._chainTails, segment.$start);
      if (head && tail) {
        if (head === tail) {
          result.push(this._chainToPath(head, segment));
          this._removeChain(head);
        } else {
          this._connectChain(head, tail, segment);
        }
      } else if (head) {
        this._append(segment, head);
      } else if (tail) {
        this._prepend(segment, tail);
      } else {
        this._createChain(segment);
      }
    }
    if (this._chains > 0) this.debugChains();
    return result;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Reset the state of this {@link Chainer}.
   * We will reuse the Chainer instance, so we need to reset the states.
   */
  _reset(size) {
    this._chainHeads = new Array(INITIAL_CHAIN_SIZE);
    this._chainTails = new Array(INITIAL_CHAIN_SIZE);
    this._points = new Array(size);
    this._next = new Array(size);
    this._chains = 0;
    this._length = 0;
  }
  /** Add the last segment to a chain and complete a path. */
  _chainToPath(id, segment) {
    const path = [];
    let i = this._chainHeads[id];
    while (i) {
      path.push(this._points[i]);
      i = this._next[i];
    }
    return path;
  }
  /** Connect two chains with matching head and tail. */
  _connectChain(head, tail, segment) {
    this._next[this._chainTails[head]] = this._chainHeads[tail];
    this._chainTails[head] = this._chainTails[tail];
    this._removeChain(tail);
  }
  /** Remove a chain after it gets connected or gets collected. */
  _removeChain(id) {
    if (id < this._chains) {
      this._chainHeads[id] = this._chainHeads[this._chains];
      this._chainTails[id] = this._chainTails[this._chains];
    }
    this._chains--;
  }
  /** Create a new chain consisting of a single segment. */
  _createChain(segment) {
    const i = ++this._length;
    this._points[i] = segment.$start;
    this._points[i + 1] = segment.$end;
    this._chainHeads[++this._chains] = i;
    this._chainTails[this._chains] = i + 1;
    this._next[i] = i + 1;
    this._next[i + 1] = 0;
    ++this._length;
  }
  /** Add a segment to the tail of a chain. */
  _append(segment, id) {
    const i = ++this._length;
    this._points[i] = segment.$end;
    this._next[this._chainTails[id]] = i;
    this._chainTails[id] = i;
    this._next[i] = 0;
  }
  /** Add a segment to the head of a chain. */
  _prepend(segment, id) {
    const i = ++this._length;
    this._points[i] = segment.$start;
    this._next[i] = this._chainHeads[id];
    this._chainHeads[id] = i;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _findChain(indices, p) {
    for (let i = 1; i <= this._chains; i++) {
      if (this.$checkFunction(this._points[indices[i]], p)) return i;
    }
    return 0;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  /**
   * We shouldn't get here in theory. If we do,
   * the general rule of thumb is that the line segments are not thoroughly subdivided,
   * causing the {@link StartEvent.$wrapCount} to add up in the wrong way.
   * In that case, look for the following possible causes:
   *
   * 1. The input may contain self-intersections within the same polygon,
   *    while taking union in the mode without checking self-intersections.
   * 2. Something might be wrong with the epsilon-comparison,
   *    resulting in missing intersection detection.
   */
  /* istanbul ignore next: debug */
  debugChains() {
    for (let i = 1; i <= this._chains; i++) {
      const path = [];
      let cursor = this._chainHeads[i];
      while (cursor) {
        path.push(this._points[cursor]);
        cursor = this._next[cursor];
      }
      console.log(pathToString(path));
    }
    debugger;
  }
  /* istanbul ignore next: debug */
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  debugSegments(segments) {
    for (const segment of segments) {
      console.log(pointToString(segment.$start), pointToString(segment.$end));
    }
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/generalUnion/generalUnion.ts
var GeneralUnion = class extends UnionBase {
  constructor() {
    super(new GeneralEventProvider(false), new GeneralIntersector());
    this._chainer = new Chainer();
    this._initializer = generalInitializer;
    /**
     * A `>>` formation: four segments are involved -- the first two converge
     * to a point on the right, but before that point, two more segments appear
     * above and below them, and these outer two converge to another point
     * further to the right. When the inner pair ends, the outer pair becomes
     * newly adjacent and their intersection must be detected.
     *
     * It turns out that in our use cases,
     * it is possible to have `>>` formation even for perfectly valid input,
     * so we need to use {@link generalEndProcessor} (which checks prev/next
     * intersections upon removal) instead of {@link simpleEndProcessor}.
     */
    this._endProcessor = generalEndProcessor;
    this._shouldPickInside = false;
    this._chainer.$checkFunction = epsilonSame;
  }
};
var generalInitializer = new Initializer(LineSegment, floatXyComparator);

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/stacking/stacking.ts
var Stacking = class extends SweepLine {
  constructor() {
    super(new GeneralEventProvider(true));
    this._orientation = deltaOrientation;
    this._parent = [];
  }
  $get(...paths) {
    this._reset();
    generalInitializer.$init(
      paths.map((p) => [p]),
      (segment, delta) => this._addSegment(segment, delta)
    );
    this._sweep();
    const stacking2 = /* @__PURE__ */ new Map();
    for (let i = 0; i < paths.length; i++) {
      const parent = this._parent[i];
      if (parent === null) {
        getOrSetEmptyArray(stacking2, paths[i]);
      } else {
        getOrSetEmptyArray(stacking2, paths[parent]).push(paths[i]);
      }
    }
    return [...stacking2].map(([outer, inner]) => ({ outer, inner }));
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _reset() {
    super._reset();
    this._parent.length = 0;
  }
  _processStart(event) {
    this._status.$insert(event, event);
    const prev = this._status.$getPrev(event);
    if (prev) event.$wrapCount += prev.$wrapCount;
    const index = event.$segment.$polygon;
    if (this._parent[index] === void 0) {
      if (event.$wrapDelta === 1 || !prev) {
        this._parent[index] = null;
      } else {
        const prevIndex = prev.$segment.$polygon;
        const prevParent = this._parent[prevIndex];
        this._parent[index] = prevParent === null ? prevIndex : prevParent;
      }
    }
  }
  _processEnd(event) {
    this._status.$delete(event.$other);
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/tasks/utils/combine.ts
var generalUnion = new GeneralUnion();
function combineContour(node) {
  const g = node.$graphics;
  const childrenPatternContours = [];
  for (const child of node.$children) {
    const contours = child.$graphics.$patternContours.filter((p) => {
      if (!p.$ids.includes(node.id)) return false;
      return true;
    });
    childrenPatternContours.push(...contours);
  }
  const result = g.$traceContours.map(toRationalContour);
  insertOuter(g.$patternContours, result);
  insertInner(childrenPatternContours, result);
  g.$contours = result.flatMap(toGraphicalContours);
}
function insertOuter(patternContours, result) {
  for (const contour of patternContours) {
    if (contour.$for !== void 0) {
      tryInsertOuter(contour, result[contour.$for]);
    } else {
      for (const rough of result) {
        if (tryInsertOuter(contour, rough)) break;
      }
    }
  }
}
function tryInsertOuter(patternContour2, rough) {
  for (const outer of rough.$outer) {
    if (tryInsert(outer, patternContour2)) return true;
  }
  return false;
}
function insertInner(childrenPatternContours, result) {
  for (const childContour of childrenPatternContours) {
    tryInsertInner(childContour, result);
  }
}
function tryInsertInner(childContour, result) {
  for (const contour of result) {
    for (const inner of contour.$inner) {
      const leaves = inner.leaves || contour.$leaves;
      if (childContour.$leaves.some((l) => !leaves.includes(l))) continue;
      if (tryInsert(inner, childContour)) return;
    }
  }
}
function tryInsert(path, insert) {
  const l = path.length;
  const first = insert[0];
  const last = insert[insert.length - 1];
  let start, end;
  for (let i = 0; i < l; i++) {
    const line = new Line(path[i], path[i + 1] || path[0]);
    if (start === void 0 && (line.$contains(first) || line.p1.eq(first))) {
      start = i + 1;
    }
    if (end === void 0 && (line.$contains(last) || line.p2.eq(last))) {
      end = i + 1;
    }
    if (start !== void 0 && end !== void 0 && start != end) {
      if (end > start) {
        path.splice(start, end - start, ...insert);
      } else {
        path.splice(start);
        path.splice(0, end);
        path.push(...insert);
      }
      return true;
    }
  }
  return false;
}
function toRationalContour(contour) {
  return {
    $outer: contour.$outer.map(toRationalPath),
    $inner: contour.$inner.map(toRationalPath),
    $leaves: contour.$leaves,
    $raw: contour.$raw
  };
}
function toGraphicalContours(contour) {
  let outers = contour.$outer.map(toPath).map(simplify);
  let inners = contour.$inner.map(toPath).map(simplify).map(reverse);
  if (inners.some((p) => p.length == 2)) debugger;
  rearrangeRole(outers, inners);
  if (contour.$raw) {
    outers = generalUnion.$get(outers);
    inners = generalUnion.$get(inners.map(reverse)).map(reverse);
    rearrangeRole(outers, inners);
  }
  outers = cleanUp(outers);
  inners = cleanUp(inners);
  if (outers.length == 1) {
    return [{
      outer: outers[0],
      inner: inners
    }];
  }
  return stacking.$get(...outers, ...inners);
}
function cleanUp(paths) {
  return paths.map(simplify).filter((c) => c.length > 2).map(fixPath);
}
function rearrangeRole(outers, inners) {
  const outerHole = outers.filter((p) => p.isHole);
  const innerFill = inners.filter((p) => !p.isHole);
  const outerFill = outers.filter((p) => !p.isHole);
  const innerHole = inners.filter((p) => p.isHole);
  outers.length = 0;
  inners.length = 0;
  outers.push(...innerFill, ...outerFill);
  inners.push(...outerHole, ...innerHole);
}
function simplify(path) {
  const deduplicated = deduplicate(path);
  const l = deduplicated.length;
  deduplicated.push(deduplicated[0]);
  const result = [];
  for (let i = 0, j = l - 1; i < l; j = i++) {
    const prev = deduplicated[j];
    const p = deduplicated[i];
    const next = deduplicated[i + 1];
    if ((prev.x != p.x || next.x != p.x) && (prev.y != p.y || next.y != p.y)) result.push(p);
  }
  result.isHole = path.isHole;
  return result;
}
function reverse(path) {
  const result = path.toReversed();
  result.isHole = !path.isHole;
  return result;
}
var stacking = new Stacking();

// ../bp-studio/box-pleating-studio/src/core/design/tasks/graphics.ts
var graphicsTask = new Task(graphics);
function graphics() {
  for (const repo of State.$repoToProcess) addRepo(repo);
  for (const repo of State.$repoWithNodeSetChanged) {
    UpdateResult.$updateStretch(repo.$stretch.$id);
    addRepo(repo);
  }
  const freeCorners = [];
  for (const stretch of State.$stretches.values()) {
    const config = stretch.$repo.$configuration;
    if (config) freeCorners.push(...config.$freeCorners.map((s) => s.corner));
  }
  for (const node of State.$contourWillChange) {
    const g = node.$graphics;
    combineContour(node);
    g.$ridges = node.$isLeaf ? flapRidge(node) : riverRidge(node, freeCorners);
    UpdateResult.$addGraphics(node.$tag, {
      contours: g.$contours,
      ridges: g.$ridges
    });
  }
  if (State.m.$treeStructureChanged) UpdateResult.$exportTree(State.m.$tree.toJSON());
}
function addRepo(repo) {
  if (!repo.$pattern) return;
  const forward = repo.$direction == 0 /* FW */;
  for (const [i, device] of repo.$pattern.$devices.entries()) {
    UpdateResult.$addGraphics("s" + repo.$stretch.$id + "." + i, {
      contours: device.$contour,
      ridges: device.$drawRidges,
      axisParallel: device.$axisParallels,
      location: device.$location,
      // Note that the range of all devices in the pattern will be updated.
      range: device.$getDraggingRange(),
      forward
    });
  }
}
function flapRidge(node) {
  const p = toCorners(node.$AABB.$toValues());
  const c = node.$AABB.$toPath();
  const ridges = [];
  for (let i = 0; i < quadrantNumber; i++) {
    const p1 = p[i], p2 = p[i + 1] || p[0], c1 = c[i];
    if (!same(p1, p2)) ridges.push([p1, p2]);
    const q = node.id << 2 | i;
    if (!State.$patternedQuadrants.has(q)) ridges.push([p1, c1]);
  }
  return ridges;
}
function riverRidge(node, freeCorners) {
  const ridges = [];
  const width = node.$length;
  const freeCornerMap = toFreeCornerMap(freeCorners);
  for (const contour of node.$graphics.$contours) {
    if (!contour.inner) continue;
    const side = contour.outer.isHole ? -1 : 1;
    const innerRightCorners = /* @__PURE__ */ new Map();
    const doubled = /* @__PURE__ */ new Set();
    for (const path of contour.inner) {
      for (const [p1, p0, p2] of pathRightCorners(path)) {
        const key = getOrderedKey(p1.x, p1.y);
        if (innerRightCorners.has(key)) doubled.add(key);
        else innerRightCorners.set(key, [p1, p0, p2]);
      }
    }
    for (const [p1, p0, p2] of pathRightCorners(contour.outer)) {
      const p = getCorrespondingPoint(p1, p0, p2, width, side);
      const innerKey = getOrderedKey(p.x, p.y);
      if (!tryAddRemainingRidge(p1, p, freeCornerMap, ridges) && innerRightCorners.has(innerKey)) {
        ridges.push([p1, p]);
        if (!doubled.has(innerKey)) innerRightCorners.delete(innerKey);
      }
    }
    for (const [p1, p0, p2] of innerRightCorners.values()) {
      const p = getCorrespondingPoint(p1, p0, p2, width, side);
      tryAddRemainingRidge(p1, p, freeCornerMap, ridges);
    }
  }
  return ridges;
}
function toFreeCornerMap(freeCorners) {
  const freeCornerMap = {
    1: /* @__PURE__ */ new Map(),
    [-1]: /* @__PURE__ */ new Map()
  };
  for (const corner of freeCorners) {
    getOrSetEmptyArray(freeCornerMap[1], corner.x - corner.y).push(corner);
    getOrSetEmptyArray(freeCornerMap[-1], corner.x + corner.y).push(corner);
  }
  return freeCornerMap;
}
function getCorrespondingPoint(p1, p0, p2, width, side) {
  const fx = Math.sign(p2.x - p0.x);
  const fy = Math.sign(p2.y - p0.y);
  return { x: p1.x - side * fy * width, y: p1.y + side * fx * width };
}
function tryAddRemainingRidge(p1, p, freeCornerMap, ridges) {
  const line = Line.$fromIPoint(p1, p);
  const f = line.$slope;
  if (f !== 1 && f !== -1) return false;
  const sideCorners = freeCornerMap[f].get(p.x - f * p.y);
  if (!sideCorners) return false;
  const corner = sideCorners.find((c) => line.$contains(c, true));
  if (corner) {
    ridges.push([p1, corner.$toIPoint()]);
    return true;
  }
  return false;
}
function* pathRightCorners(path) {
  const l = path.length;
  for (let i = 0, j = l - 1; i < l; j = i++) {
    const p1 = path[i];
    if (!Number.isInteger(p1.x) || !Number.isInteger(p1.y)) continue;
    const p0 = path[j];
    const p2 = path[i + 1] || path[0];
    const dot = (p1.x - p0.x) * (p2.x - p1.x) + (p1.y - p0.y) * (p2.y - p1.y);
    if (dot == 0) yield [p1, p0, p2];
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/trace/hingeSegment.ts
function createHingeSegments(hinges, dir) {
  const l = hinges.length;
  const directions = mapDirections(hinges);
  const results = [];
  const start = directions.findIndex((d) => d % 2 != dir);
  let currentSegment;
  for (let i = 0; i < l; i++) {
    const index = (start + i) % l;
    const p = hinges[index];
    if (currentSegment) {
      currentSegment.push(p);
      if (directions[index] != currentSegment.q) {
        results.push(currentSegment);
        currentSegment = void 0;
      }
    }
    if (!currentSegment) {
      const nextDir = directions[(start + i + 1) % l];
      if (nextDir % 2 == dir) {
        currentSegment = [p];
        currentSegment.q = nextDir;
      }
    }
  }
  if (currentSegment) {
    currentSegment.push(hinges[start]);
    results.push(currentSegment);
  }
  return results;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/trace/traceContext.ts
var TraceContext = class {
  /**
   * @param trace The underlying {@link Trace} instance.
   * @param hinges The hinge path. It is assumed to be simplified and oriented counterclockwise.
   */
  constructor(trace, hinges) {
    this.$valid = false;
    this._trace = trace;
    this._hinges = candidateRoughContourLines(hinges);
    if (!this._hinges.length) return;
    this.$valid = true;
  }
  /**
   * Find the first candidate line that intersects the pattern, and decide the initial ray.
   */
  $getInitialNode(ridges, startDiagonal) {
    for (const hinge of this._hinges) {
      const v = hinge.$vector;
      const ray = { point: hinge.p1, vector: v };
      if (startDiagonal) {
        const p = hinge.$intersectLine(startDiagonal, false);
        if (p) {
          const hv = this._diagonalHitInitialVector(hinge, v, startDiagonal);
          if (!p.eq(startDiagonal.p0)) {
            return { point: p, vector: hv };
          } else {
            ray.vector = hv;
            ray.point = p.$sub(hv);
            startDiagonal = void 0;
          }
        }
      }
      const intersection2 = getNextIntersection(
        ridges,
        ray,
        hinge.p1
        // In finding initial vector, the head of the hinge should be ignored.
      );
      if (!intersection2) continue;
      const result = {
        point: intersection2.point,
        vector: intersection2.line.$reflect(ray.vector)
      };
      ridges.delete(intersection2.line);
      return result;
    }
    return null;
  }
  /**
   * Remove the first or last point of the generated path if needed,
   * so that the resulting path is irredundant.
   */
  $trim(path) {
    if (path.length <= 1) return null;
    const firstLine = new Line(path[0], path[1]);
    const lastLine = new Line(path[path.length - 2], path[path.length - 1]);
    if (this._testEndPoints(lastLine, false)) path.pop();
    if (this._testEndPoints(firstLine, true)) path.shift();
    if (path.length <= 1) return null;
    return path;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _testEndPoints(line, start) {
    for (const hinge of this._hinges) {
      if (hinge.$contains(start ? line.p2 : line.p1) && hinge.$vector.$parallel(line.$vector)) return true;
    }
    return false;
  }
  /**
   * If the first line hit by a candidate line is a {@link SideDiagonal},
   * it may or may not reflect about it, depending on whether the {@link RoughContour}
   * wraps around {@link SideDiagonal.p0}.
   */
  _diagonalHitInitialVector(hinge, v, diagonal) {
    const cornerIsOnOutside = hinge.$pointIsOnRight(diagonal.p0, true);
    const forward = this._trace.$direction == 0 /* FW */;
    const resultIsVertical = forward == cornerIsOnOutside;
    const lineIsVertical = v.x == 0;
    return resultIsVertical == lineIsVertical ? v : diagonal.$reflect(v);
  }
};
function getNextIntersection(ridges, node, omit) {
  let result = null;
  const { point, vector, last: shift2 } = node;
  for (const ridge of ridges) {
    const intersection2 = getIntersection(
      ridge,
      point,
      vector,
      true,
      Boolean(omit),
      ridge.$type !== void 0
      // Outgoing ridges should be treated as rays.
    );
    if (!intersection2 || omit && intersection2.point.eq(omit)) continue;
    const angle = shift2 ? getAngle(vector, shift2) : void 0;
    const isP1 = intersection2.point.eq(ridge.p1);
    const isP2 = intersection2.point.eq(ridge.p2);
    if (!isSideDiagonal(intersection2.line) && !isShiftTouchable(ridge, point, vector, angle)) continue;
    intersection2.endPoint = isP1 || isP2;
    intersection2.angle = getAngle(vector, ridge.$vector);
    if (isCloser(intersection2, result)) result = intersection2;
  }
  return result;
}
function getAngle(v1, v2) {
  let ang = v1.$angle - v2.$angle;
  while (ang < 0) ang += Math.PI;
  while (ang > Math.PI) ang -= Math.PI;
  return ang;
}
function isCloser(r, x) {
  return x == null || r.dist.lt(x.dist) || r.dist.eq(x.dist) && // SideDiagonals should always go first.
  (isSideDiagonal(r.line) || !isSideDiagonal(x.line) && r.angle < x.angle);
}
function isSideDiagonal(line) {
  return "p0" in line;
}
function isShiftTouchable(ridge, from, v, ang) {
  const rv = v.$rotate90();
  const v1 = ridge.p1.$sub(from), v2 = ridge.p2.$sub(from);
  const r1 = v1.$dot(rv), r2 = v2.$dot(rv);
  const d1 = v1.$dot(v), d2 = v2.$dot(v);
  const result = (
    // One endpoint of the segment lies completely on the side
    (r1 > 0 || r2 > 0) && // At least one endpoint is in front
    (d1 > 0 || d2 > 0 || // or, the angle of the given ridge is further in front of the previously hit ridge
    Boolean(ang) && getAngle(v, ridge.$vector) > ang)
  );
  return result;
}
function candidateRoughContourLines(path) {
  const result = [];
  const l = path.length;
  const points = path.map((p) => new Point(p));
  for (let i = 0; i < l - 1; i++) {
    result.push(new Line(points[i], points[i + 1]));
  }
  return result;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/trace/trace.ts
var Trace = class _Trace {
  constructor(ridges, dir, sideDiagonals) {
    this.$ridges = ridges;
    this.$direction = dir;
    this.$sideDiagonals = sideDiagonals.filter((d) => !d.$isDegenerated);
  }
  $generate(hinges, start, end, rawMode) {
    const ctx = new TraceContext(this, hinges);
    if (!ctx.$valid) return null;
    const directionalVector = new Vector(1, this.$direction == 0 /* FW */ ? 1 : -1);
    const ridges = this._createFilteredRidges(start, end, directionalVector);
    const path = [];
    const startDiagonal = this.$sideDiagonals.find((d) => d.$lineContains(start));
    let cursor = ctx.$getInitialNode(ridges, startDiagonal);
    if (!cursor) return null;
    path.push(cursor.point);
    const endDiagonal = this.$sideDiagonals.find((d) => d.$contains(end, true));
    if (endDiagonal) ridges.add(endDiagonal);
    while (true) {
      const intersection2 = getNextIntersection(ridges, cursor);
      if (!intersection2) break;
      ridges.delete(intersection2.line);
      cursor = {
        last: intersection2.line.$vector,
        point: intersection2.point,
        vector: intersection2.line.$reflect(cursor.vector)
      };
      const lastPoint = path[path.length - 1];
      if (!lastPoint.eq(cursor.point)) {
        const line = new Line(lastPoint, cursor.point);
        const test = line.$intersection(end, directionalVector);
        if (test && !test.eq(cursor.point)) break;
        path.push(cursor.point);
      }
    }
    const result = ctx.$trim(path);
    if (!rawMode) return result;
    else return _Trace._rawModeFinalCheck(result, hinges, cursor.vector);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * In raw mode, we need to make some extra checks to make sure the
   * generated contour actually fits the given hinge segment.
   */
  static _rawModeFinalCheck(result, hinges, lastVec) {
    if (!result) return null;
    const hingeLines = [];
    const lastPoint = result[result.length - 1];
    for (let i = hinges.length - 1; i > 0; i--) {
      const line = Line.$fromIPoint(hinges[i], hinges[i - 1]);
      hingeLines.push(line);
      if (line.$contains(lastPoint, true)) return result;
    }
    const findIntersection = (pt, v) => {
      for (const hinge of hingeLines) {
        const intersection2 = hinge.$intersection(pt, v, true);
        if (intersection2) return intersection2;
      }
      return null;
    };
    if (lastVec.x == 0 || lastVec.y == 0) {
      const intersection2 = findIntersection(result[result.length - 1], lastVec);
      if (intersection2) {
        result.push(intersection2);
        return result;
      }
    }
    for (let i = result.length - 1; i > 0; i--) {
      const last = result[i];
      const prev = result[i - 1];
      const vec = last.$sub(prev);
      if (vec.x != 0 && vec.y != 0) break;
      result.pop();
      const intersection2 = findIntersection(prev, vec);
      if (intersection2) {
        result.push(intersection2);
        return result;
      }
    }
    return null;
  }
  _createFilteredRidges(start, end, directionalVector) {
    let startLine = new Line(start, directionalVector);
    let endLine = new Line(end, directionalVector);
    if (startLine.$pointIsOnRight(end)) startLine = startLine.$reverse();
    if (endLine.$pointIsOnRight(start)) endLine = endLine.$reverse();
    const filteredRidges = this.$ridges.filter(
      (r) => (!startLine.$pointIsOnRight(r.p1, true) || !startLine.$pointIsOnRight(r.p2, true)) && (!endLine.$pointIsOnRight(r.p1, true) || !endLine.$pointIsOnRight(r.p2, true) || // Include the intersection ridge when applicable
      endLine.$lineContains(r.p1) && endLine.$lineContains(r.p2))
    );
    return new Set(filteredRidges);
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/quadrant.ts
var Quadrant = class {
  constructor(code, junctions) {
    this.$flap = State.m.$tree.$nodes[getNodeId(code)];
    this.q = getQuadrant(code);
    this.f = getFactors(this.q);
    this._junctions = junctions;
    const ox = [], oy = [];
    for (let i = 0; i < junctions.length; i++) {
      const junction2 = junctions[i];
      ox.push(junction2.$o.x);
      oy.push(junction2.$o.y);
    }
    this.o = { x: Math.max(...ox), y: Math.max(...oy) };
    this.w = pointWeight(this.$point, this.f);
  }
  /** Basic validity checks. */
  $checkValidity(nodeSet) {
    for (let i = 0; i < this._junctions.length; i++) {
      const j1 = this._junctions[i];
      for (let j = i + 1; j < this._junctions.length; j++) {
        const j2 = this._junctions[j];
        if (oneIsContainedInAnother(j1.$o, j2.$o)) return false;
        const offset = getDeltaPointOffsetFromCorner(j1, j2);
        const n1 = this._getOppositeId(j1);
        const n2 = this._getOppositeId(j2);
        const r = nodeSet.$distTriple(n1, n2, this.$flap.id).d3;
        const deltaPtDist = new Vector(r - offset.x, r - offset.y).$length;
        if (deltaPtDist < r) return false;
      }
    }
    return true;
  }
  get $startEndPoints() {
    const r = this.$flap.$length;
    const { x, y } = this.o;
    const result = [
      new Point(this.x(r), this.y(r - y)),
      new Point(this.x(r - x), this.y(r))
    ];
    if (this.q % 2 != 0 /* FW */) result.reverse();
    return result;
  }
  /**
   * In case there are rivers, calculate the corner of the overlap region.
   * @param ov The {@link JOverlap} to calculate.
   * @param junction The parent {@link JJunction} from which {@link ov} derives.
   * @param q Which corner (before transformation) to get
   * @param d Additional distance
   */
  $getOverlapCorner(ov, junction2, q, d) {
    const r = this.$flap.$length + d;
    let sx = ov.shift?.x ?? 0;
    let sy = ov.shift?.y ?? 0;
    if (this.$flap.id != junction2.c[0].e) {
      sx = junction2.ox - (ov.ox + sx);
      sy = junction2.oy - (ov.oy + sy);
    }
    return new Point(
      this.x(r - (q == 3 /* LR */ ? 0 : ov.ox) - sx),
      this.y(r - (q == 1 /* UL */ ? 0 : ov.oy) - sy)
    );
  }
  /**
   * Flap tip (not the corner) of this {@link Quadrant}.
   */
  get $point() {
    return this.$flap.$AABB.$points[this.q];
  }
  /**
   * Hinge corner of this {@link Quadrant} by a given radius.
   */
  $corner(r) {
    return { x: this.x(r), y: this.y(r) };
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Get the y-coordinate that is {@link d} units away from the tip.
   */
  y(d) {
    return this.$point.y + this.f.y * d;
  }
  /**
   * Get the x-coordinate that is {@link d} units away from the tip.
   */
  x(d) {
    return this.$point.x + this.f.x * d;
  }
  _getOppositeId(j) {
    return j.$a.id == this.$flap.id ? j.$b.id : j.$a.id;
  }
};
var minQuadrantWeightComparator = (a, b) => a.w - b.w;
function startEndPoints(quadrants2) {
  let [start, end] = quadrants2[0].$startEndPoints;
  const f = quadrants2[0].f;
  for (let i = 1; i < quadrants2.length; i++) {
    const [newStart, newEnd] = quadrants2[i].$startEndPoints;
    if (pointWeight(newStart, f) < pointWeight(start, f)) start = newStart;
    if (pointWeight(newEnd, f) > pointWeight(end, f)) end = newEnd;
  }
  return [start, end];
}
function pointWeight(p, f) {
  return f.x * p.y - f.y * p.x;
}
var QV = [
  new Vector(1, 1),
  new Vector(-1, 1),
  new Vector(-1, -1),
  new Vector(1, -1)
];
function getFactors(q) {
  return {
    x: q == 0 /* UR */ || q == 3 /* LR */ ? 1 : -1,
    y: q == 0 /* UR */ || q == 1 /* UL */ ? 1 : -1
  };
}
function getDeltaPointOffsetFromCorner(j1, j2) {
  return {
    x: Math.min(j1.$o.x, j2.$o.x),
    y: Math.min(j1.$o.y, j2.$o.y)
  };
}
function oneIsContainedInAnother(o1, o2) {
  return o1.x <= o2.x && o1.y <= o2.y || o2.x <= o1.x && o2.y <= o1.y;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/trace/repoTrace.ts
var RepoTrace = class extends Trace {
  constructor(repo) {
    super(
      repo.$pattern.$devices.flatMap((d) => d.$traceRidges),
      repo.$direction,
      repo.$configuration.$sideDiagonals
    );
    this.$repo = repo;
    this.$leaves = new Set(repo.$nodeSet.$leaves);
  }
  /** Determine the starting/ending point of tracing. */
  $resolveStartEnd(filtered, all) {
    let [start, end] = startEndPoints(filtered);
    if (filtered.length != all.length) {
      filtered.sort(minQuadrantWeightComparator);
      const first = all.indexOf(filtered[0]);
      const last = all.indexOf(filtered[filtered.length - 1]);
      if (first > 0) {
        const a = all[first - 1].$flap.id, b = all[first].$flap.id;
        const ridge = this._getIntersectionRidge(a, b);
        if (ridge) start = ridge.p1;
      }
      if (last < all.length - 1) {
        const a = all[last].$flap.id, b = all[last + 1].$flap.id;
        const ridge = this._getIntersectionRidge(a, b);
        if (ridge) end = ridge.p1;
      }
    }
    return [start, end];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _getIntersectionRidge(a, b) {
    if (a > b) [a, b] = [b, a];
    return this.$ridges.find((r) => r.$division && r.$division[0] == a && r.$division[1] == b);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  /* istanbul ignore next: debug */
  createTestCase(hinges, start, end) {
    const simp = (s) => JSON.stringify(s).replace(/"(\w+)":/g, "$1:");
    const ridges = `Line.$parseTest(${simp(this.$ridges)})`;
    const dir = "SlashDirection." + (this.$direction == 0 /* FW */ ? "FW" : "BW");
    const sideDiagonals = `Line.$parseTest<SideDiagonal>(${simp(this.$sideDiagonals)})`;
    return `const trace = new Trace(${ridges}, ${dir}, ${sideDiagonals});
const result = trace.$generate(parsePath("${pathToString(hinges)}"), new Point${start.toString()}, new Point${end.toString()});`;
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/core/design/tasks/patternContour.ts
var patternContourTask = new Task(patternContour, graphicsTask);
function patternContour() {
  for (const repo of State.$repoToProcess) {
    clearPatternContourForRepo(repo);
    if (!repo.$pattern) continue;
    const trace = new RepoTrace(repo);
    try {
      const coverageMap = repo.$nodeSet.$quadrantCoverage;
      for (const [node, coveredQuadrants] of coverageMap.entries()) {
        processNode(node, trace, coveredQuadrants);
      }
    } catch (e) {
      if (e instanceof InvalidParameterError) {
        continue;
      } else {
        throw e;
      }
    }
  }
  for (const [repo, nodes] of State.$repoToPartiallyProcess) {
    const trace = new RepoTrace(repo);
    try {
      for (const node of nodes) {
        clearPatternContourForNode(repo, node);
        const coveredQuadrants = repo.$nodeSet.$quadrantCoverage.get(node);
        processNode(node, trace, coveredQuadrants);
      }
    } catch (e) {
      if (e instanceof InvalidParameterError) continue;
      else throw e;
    }
  }
  for (const repo of State.$repoWithNodeSetChanged) {
    for (const node of nodesOfRepo(repo)) {
      for (const contour of node.$graphics.$patternContours) {
        contour.$ids = repo.$nodeSet.$nodes;
      }
    }
  }
}
function processNode(node, trace, coveredQuadrants) {
  const multiContour = node.$graphics.$traceContours.length > 1;
  const oppositeMap = trace.$repo.$oppositeMap;
  for (const [index, traceContour2] of node.$graphics.$traceContours.entries()) {
    const traceLeaves = new Set(traceContour2.$leaves);
    for (const outer of traceContour2.$outer) {
      const leaves = outer.leaves ? outer.leaves.filter((l) => trace.$leaves.has(l)) : traceContour2.$leaves;
      if (traceContour2.$raw) {
        if (leaves.every((l) => oppositeMap[l].every((o) => traceLeaves.has(o)))) continue;
      }
      const quadrants2 = coveredQuadrants.filter((q) => !multiContour || leaves.includes(q.$flap.id));
      const map = createStartEndMap(quadrants2, trace);
      const hingeSegments = createHingeSegments(outer, trace.$repo.$direction);
      const context = { map, trace, node, index };
      for (const hingeSegment of hingeSegments) {
        processTrace(hingeSegment, context, leaves, traceContour2.$raw);
      }
    }
  }
}
function createStartEndMap(quadrants2, trace) {
  const startEndMap = {};
  for (let q = 0; q < quadrantNumber; q++) {
    const filtered = quadrants2.filter((quadrant) => quadrant.q == q);
    if (!filtered.length) continue;
    startEndMap[q] = trace.$resolveStartEnd(filtered, trace.$repo.$directionalQuadrants[q]);
  }
  return startEndMap;
}
function processTrace(hingeSegment, context, leaves, rawMode) {
  const map = context.map[hingeSegment.q];
  if (!map) return;
  const contour = context.trace.$generate(hingeSegment, map[0], map[1], rawMode);
  if (contour) {
    State.$contourWillChange.add(context.node);
    contour.$ids = context.trace.$repo.$nodeSet.$nodes;
    contour.$repo = context.trace.$repo.$signature;
    contour.$for = context.index;
    contour.$leaves = leaves;
    context.node.$graphics.$patternContours.push(contour);
  }
}
function clearPatternContourForRepo(repo) {
  for (const node of nodesOfRepo(repo)) {
    clearPatternContourForNode(repo, node);
  }
}
function* nodesOfRepo(repo) {
  for (const id of repo.$nodeSet.$nodes) {
    const node = State.m.$tree.$nodes[id];
    if (node) yield node;
  }
}
function clearPatternContourForNode(repo, node) {
  const g = node.$graphics;
  if (g.$patternContours.some((p) => p.$repo == repo.$signature)) {
    State.$contourWillChange.add(node);
    g.$patternContours = g.$patternContours.filter((p) => p.$repo != repo.$signature);
  }
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/segment/aaLineSegment.ts
var AALineSegment = class _AALineSegment {
  constructor(start, end, polygon) {
    this.$type = 1 /* AALine */;
    this.$start = start;
    this.$end = end;
    this.$polygon = polygon;
    this.$isHorizontal = start.y === end.y;
  }
  $subdivide(point, oriented) {
    let newSegment;
    if (oriented) {
      newSegment = new _AALineSegment(point, this.$end, this.$polygon);
      this.$end = point;
    } else {
      newSegment = new _AALineSegment(this.$start, point, this.$polygon);
      this.$start = point;
    }
    return newSegment;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/aaUnion/aaIntersector.ts
var AAIntersector = class extends Intersector {
  constructor(checkSelfIntersection) {
    super();
    this._checkSelfIntersection = checkSelfIntersection;
  }
  /**
   * Find possible intersection between segments and
   * subdivides existing segments, adding new events if necessary.
   * @param ev1 The first segment (in the order of {@link _status}).
   * @param ev2 The second segment (in the order of {@link _status}).
   */
  $possibleIntersection(ev1, ev2) {
    if (!ev1 || !ev2) return;
    if (!this._checkSelfIntersection && ev1.$segment.$polygon === ev2.$segment.$polygon) return;
    this._processAALineSegments(ev1, ev2);
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/aaUnion/aaEventProvider.ts
var SHIFT_Y = 17;
var SHIFT_START = 16;
var SHIFT_HOR = 15;
var SHIFT_DELTA = 14;
var AAEventProvider = class extends EventProvider {
  constructor() {
    super(...arguments);
    this.$eventComparator = eventComparator2;
    this.$statusComparator = statusComparator2;
  }
  $createStart(startPoint, segment, delta) {
    const key = getKey2(startPoint, 1, segment, delta, this._nextId++);
    return new StartEvent(startPoint, segment, delta, key);
  }
  $createEnd(endPoint, segment) {
    const key = getKey2(endPoint, 0, segment, 1, this._nextId++);
    return new EndEvent(endPoint, key);
  }
};
var eventComparator2 = (a, b) => a.$point.x - b.$point.x || a.$key - b.$key;
var statusComparator2 = (a, b) => a.$key - b.$key;
function getKey2(point, isStart, segment, delta, id) {
  let hor = segment.$isHorizontal ? 1 : 0;
  if (isStart) hor ^= 1;
  return (
    // Sort by y-coordinate first.
    // Notice that negative values won't affect the comparison of the remaining parts.
    point.y - COORDINATE_SHIFT << SHIFT_Y | // for the events at the same location, end events goes first
    isStart << SHIFT_START | // for the events at the same location and type,
    // horizontal edges goes first for start events,
    // and it will be the other way for end events.
    hor << SHIFT_HOR | // For overlapping start events, entering segment goes before exiting segment,
    // so that wrapCount will not be temporarily zero and causes misjudgment.
    (delta === 1 ? 0 : 1) << SHIFT_DELTA | // There's no need to sort in any particular ways for overlapping events of the same type;
    // especially notice that the overall sorting is not effected by subdivision of segments.
    id
  );
}
var COORDINATE_SHIFT = 4096;

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/aaUnion/aaUnion.ts
var AAUnion = class extends UnionBase {
  constructor(checkSelfIntersection = false) {
    super(new AAEventProvider(), new AAIntersector(checkSelfIntersection));
    this._chainer = new Chainer();
    this._initializer = AAInitializer;
  }
};
var AAInitializer = new Initializer(AALineSegment, xyComparator);

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/rrIntersection/rrIntersector.ts
var RRIntersector = class extends Intersector {
  /**
   * Find possible intersection between segments and
   * subdivides existing segments, adding new events if necessary.
   * @param ev1 The first segment (in the order of {@link _status}).
   * @param ev2 The second segment (in the order of {@link _status}).
   */
  $possibleIntersection(ev1, ev2) {
    if (!ev1 || !ev2) return;
    const seg1 = ev1.$segment;
    const seg2 = ev2.$segment;
    if (seg1.$polygon === seg2.$polygon) return;
    if (seg1.$type === seg2.$type) {
      if (seg1.$type === 1 /* AALine */) this._processAALineSegments(ev1, ev2);
      else this._processArcSegments(ev1, ev2);
    } else {
      if (seg1.$type === 1 /* AALine */) this._processArcVsAALine(ev2, ev1);
      else this._processArcVsAALine(ev1, ev2);
    }
  }
  /** Process the intersection between two arcs. */
  _processArcSegments(ev1, ev2) {
    let seg1 = ev1.$segment;
    let seg2 = ev2.$segment;
    const intersections = seg1.$intersection(seg2);
    for (let p of intersections) {
      p = ref(ref(p, seg1), seg2);
      const in1 = seg1.$inArcRange(p), in2 = seg2.$inArcRange(p);
      if (in1 < -EPSILON && in2 < EPSILON) {
        ev1 = this._subdivide(ev1, p);
        seg1 = ev1.$segment;
      }
      if (in1 < EPSILON && in2 < -EPSILON) {
        ev2 = this._subdivide(ev2, p);
        seg2 = ev2.$segment;
      }
    }
  }
  /** Process the intersection of an arc and an AA line segment. */
  _processArcVsAALine(eArc, eLine) {
    const arc = eArc.$segment;
    const line = eLine.$segment;
    if (line.$isHorizontal) {
      const y = line.$start.y;
      const da = (y - arc.$start.y) * (y - arc.$end.y);
      if (da > EPSILON) return;
      const r = arc.$radius;
      const dy = y - arc.$center.y;
      const dx = leg(r, dy);
      const x = arc.$center.x + (arc.$start.y > arc.$end.y ? -dx : dx);
      const p = ref(ref({ x, y }, line), arc);
      const dl = (x - eLine.$point.x) * (x - eLine.$other.$point.x);
      if (da < -EPSILON && dl < EPSILON) this._subdivide(eArc, p);
      if (da < EPSILON && dl < -EPSILON) this._subdivide(eLine, p);
    } else {
      const x = line.$start.x;
      const da = (x - arc.$start.x) * (x - arc.$end.x);
      if (da > EPSILON) return;
      const y = yIntercept(arc, x);
      const p = ref(ref({ x, y }, line), arc);
      const dl = (y - eLine.$point.y) * (y - eLine.$other.$point.y);
      if (da < -EPSILON && dl < EPSILON) this._subdivide(eArc, p);
      if (da < EPSILON && dl < -EPSILON) this._subdivide(eLine, p);
    }
  }
};
function yIntercept(arc, x) {
  const r = arc.$radius;
  const dx = x - arc.$center.x;
  const dy = leg(r, dx);
  return arc.$center.y + (arc.$start.x > arc.$end.x ? dy : -dy);
}
function ref(p, seg) {
  if (epsilonSame(p, seg.$start)) return seg.$start;
  if (epsilonSame(p, seg.$end)) return seg.$end;
  return p;
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/rrIntersection/rrEventProvider.ts
var RREventProvider = class extends EventProvider {
  constructor() {
    super(...arguments);
    this.$eventComparator = eventComparator3;
    this.$statusComparator = statusComparator3;
  }
  $createStart(startPoint, segment, delta) {
    return new StartEvent(startPoint, segment, delta, this._nextId++);
  }
  $createEnd(endPoint, segment) {
    return new EndEvent(endPoint, this._nextId++);
  }
};
var eventComparator3 = (a, b) => xyComparator(a.$point, b.$point) || // End events are prioritized for the events at the same location.
a.$isStart - b.$isStart || a.$isStart && segmentComparator2(a, b) || a.$key - b.$key;
var statusComparator3 = (a, b) => statusYComparator(a, b) || // If a newly started line segment happens to intersect an existing segment in its interior,
// the last computed result will be 0, and in theory the following results will not be of the desired order,
// but it doesn't matter because the existing segment will be split,
// and the new segments produced by the split will be compared again and inserted in the correct order.
// We just need to make sure that when such an intersection occurs for the first time,
// the existing segments are split correctly.
segmentComparator2(a, b) || a.$key - b.$key;
var segmentComparator2 = (a, b) => (
  // The one with the smaller tangent slope goes first (be aware of floating error)
  fixZero(getSlope2(a) - getSlope2(b)) || // Compare the curvature if the tangent slope equals
  getCurvature(a) - getCurvature(b) || // In case of overlapping, the exiting segment goes first (opposite to case of union)
  a.$wrapDelta - b.$wrapDelta
);
var statusYComparator = (a, b) => {
  if (a.$point.x < b.$point.x && a.$segment.$type === 2 /* Arc */) {
    return yIntercept(a.$segment, b.$point.x) - b.$point.y;
  } else if (b.$point.x < a.$point.x && b.$segment.$type === 2 /* Arc */) {
    return a.$point.y - yIntercept(b.$segment, a.$point.x);
  } else {
    return a.$point.y - b.$point.y;
  }
};
function getSlope2(e) {
  const seg = e.$segment;
  if (seg.$type === 1 /* AALine */) {
    return seg.$isHorizontal ? 0 : Number.POSITIVE_INFINITY;
  } else {
    const dx = seg.$anchor.x - e.$point.x;
    const dy = seg.$anchor.y - e.$point.y;
    if (dx > EPSILON) return dy / dx;
    return dy > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
}
function getCurvature(e) {
  const seg = e.$segment;
  if (seg.$type === 1 /* AALine */) return 0;
  const sgn = e.$point === seg.$start ? 1 : -1;
  return sgn / seg.$radius;
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/chainer/arcChainer.ts
var ArcChainer = class extends Chainer {
  _chainToPath(id, segment) {
    const path = super._chainToPath(id, segment);
    _trySetArcSegment(path[0], segment);
    return path;
  }
  /* istanbul ignore next: won't encounter for our use case */
  _connectChain(head, tail, segment) {
    _trySetArcSegment(this._points[this._chainHeads[tail]], segment);
    super._connectChain(head, tail, segment);
  }
  _append(segment, id) {
    super._append(segment, id);
    _trySetArcSegment(this._points[this._chainTails[id]], segment);
  }
  _prepend(segment, id) {
    _trySetArcSegment(this._points[this._chainHeads[id]], segment);
    super._prepend(segment, id);
  }
  _createChain(segment) {
    super._createChain(segment);
    _trySetArcSegment(this._points[this._length], segment);
  }
};
function _trySetArcSegment(p, segment) {
  if (segment.$type === 2 /* Arc */) {
    p.arc = segment.$anchor;
    p.r = segment.$radius;
  }
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/segment/arcSegment.ts
var ArcSegment = class _ArcSegment {
  constructor(c, r, s, e, polygon) {
    this.$type = 2 /* Arc */;
    this.$polygon = polygon;
    this.$center = c;
    this.$radius = r;
    this._start = s;
    this._end = e;
    this._update();
  }
  get $start() {
    return this._start;
  }
  set $start(p) {
    this._start = p;
    this._update();
  }
  get $end() {
    return this._end;
  }
  set $end(p) {
    this._end = p;
    this._update();
  }
  $subdivide(point, oriented) {
    let newSegment;
    if (oriented) {
      newSegment = new _ArcSegment(this.$center, this.$radius, point, this.$end, this.$polygon);
      this.$end = point;
    } else {
      newSegment = new _ArcSegment(this.$center, this.$radius, this.$start, point, this.$polygon);
      this.$start = point;
    }
    this._update();
    return newSegment;
  }
  /** Find the intersection(s) of two circles (assuming full circle) */
  *$intersection(that) {
    const { x: x1, y: y1 } = this.$center, r1 = this.$radius;
    const { x: x2, y: y2 } = that.$center, r2 = that.$radius;
    const dx = x1 - x2;
    const dy = y1 - y2;
    if (!dx && !dy) return;
    const r = r1 + r2;
    const ds = dx * dx + dy * dy;
    if (ds > r * r) return;
    const d = Math.sqrt(ds);
    const l = (r1 * r1 - r2 * r2 + ds) / d / 2;
    if (l > r1) return;
    const h = leg(r1, l);
    if (h === 0) {
      yield { x: x1 - dx * l / d, y: y1 - dy * l / d };
    } else {
      const result = [
        { x: x1 - (dx * l + dy * h) / d, y: y1 - (dy * l - dx * h) / d },
        { x: x1 - (dx * l - dy * h) / d, y: y1 - (dy * l + dx * h) / d }
      ];
      result.sort(xyComparator);
      yield result[0];
      yield result[1];
    }
  }
  /**
   * Using vectors to quickly check if a given point is within the range of the arc,
   * without involving atan calculations. Returns a negative value if the point is in the interior,
   * zero if it's on the endpoints, and positive value if it's outside the arc.
   */
  $inArcRange(p) {
    if ((p.x - this.$center.x) * this._out.x + (p.y - this.$center.y) * this._out.y <= 0) return 1;
    const { x, y } = this._delta;
    const weight = ((p.x - this._start.x) * x + (p.y - this._start.y) * y) / (x * x + y * y);
    return weight * (weight - 1);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Update the vector for comparison etc. */
  _update() {
    const e = this._end, s = this._start, c = this.$center;
    this._delta = { x: e.x - s.x, y: e.y - s.y };
    let r = (e.y - s.y) / (s.x + e.x - 2 * c.x);
    r = 1 + r * r;
    this._out = { x: ((e.x + s.x) / 2 - c.x) * r, y: ((e.y + s.y) / 2 - c.y) * r };
    this.$anchor = { x: c.x + this._out.x, y: c.y + this._out.y };
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/rrIntersection/rrIntersection.ts
var RRIntersection = class extends PolyBool {
  constructor() {
    super(new RREventProvider(), new RRIntersector());
    this._chainer = new ArcChainer();
    this._endProcessor = simpleEndProcessor;
    this._shouldPickInside = true;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _initialize(components) {
    for (let i = 0; i < components.length; i++) {
      const { x, y, width: w, height: h, radius: r } = components[i];
      this._addSegment(new ArcSegment(
        { x, y },
        r,
        { x: x - r, y },
        { x, y: y - r },
        i
      ), 1);
      this._addSegment(new ArcSegment(
        { x: x + w, y },
        r,
        { x: x + w, y: y - r },
        { x: x + w + r, y },
        i
      ), 1);
      this._addSegment(new ArcSegment(
        { x: x + w, y: y + h },
        r,
        { x: x + w + r, y: y + h },
        { x: x + w, y: y + h + r },
        i
      ), -1);
      this._addSegment(new ArcSegment(
        { x, y: y + h },
        r,
        { x, y: y + h + r },
        { x: x - r, y: y + h },
        i
      ), -1);
      if (w) {
        this._addSegment(new AALineSegment({ x, y: y - r }, { x: x + w, y: y - r }, i), 1);
        this._addSegment(new AALineSegment({ x: x + w, y: y + h + r }, { x, y: y + h + r }, i), -1);
      }
      if (h) {
        this._addSegment(new AALineSegment({ x: x + w + r, y }, { x: x + w + r, y: y + h }, i), 1);
        this._addSegment(new AALineSegment({ x: x - r, y: y + h }, { x: x - r, y }, i), -1);
      }
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/tasks/utils/expand.ts
function expandPath(path, units) {
  const l = path.length;
  const result = [];
  for (let i = 0, j = l - 1; i < l; j = i++) {
    const p = path[i];
    const p1 = path[j], p2 = path[i + 1] || path[0];
    const dx = Math.sign(p2.y - p1.y) * units;
    const dy = Math.sign(p1.x - p2.x) * units;
    result.push({ x: p.x + dx, y: p.y + dy });
  }
  result.isHole = path.isHole;
  return result;
}
function simplify2(path) {
  if (!path) return [];
  const deduplicated = deduplicate(path);
  const l = deduplicated.length;
  deduplicated.push(deduplicated[0]);
  const result = [];
  for (let i = 0, j = l - 1; i < l; j = i++) {
    const prev = deduplicated[j];
    const next = deduplicated[i + 1];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    if (dx != 0 && dy != 0) result.push(deduplicated[i]);
  }
  result.isHole = path.isHole;
  return result;
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/traceContour.ts
var coveredJunctionMap = /* @__PURE__ */ new Map();
var stretchMap = /* @__PURE__ */ new Map();
var signatureCache = /* @__PURE__ */ new Map();
var aaUnion = new AAUnion();
var expander = new AAUnion(true);
var traceContourTask = new Task(traceContour, patternContourTask);
function traceContour() {
  coveredJunctionMap.clear();
  const junctions = [...State.$junctions.values()].filter((j) => j.$valid);
  for (const junction2 of junctions) {
    const covering = junction2.$getCovering();
    if (covering.length == 0) continue;
    const a = junction2.$a.id;
    const b = junction2.$b.id;
    if (covering.every((j) => !j.$involves(a))) {
      getOrSetEmptyArray(coveredJunctionMap, a).push(junction2);
    }
    if (covering.every((j) => !j.$involves(b))) {
      getOrSetEmptyArray(coveredJunctionMap, b).push(junction2);
    }
  }
  stretchMap.clear();
  for (const stretch of State.$stretches.values()) {
    if (!stretch.$repo.$pattern) continue;
    const nodes = stretch.$repo.$nodeSet.$nodes;
    for (const id of nodes) {
      getOrSetEmptyArray(stretchMap, id).push(stretch);
    }
  }
  const tree = State.m.$tree;
  const stretchChanged = /* @__PURE__ */ new Set();
  for (let i = 0; i < tree.$nodes.length; i++) {
    const node = tree.$nodes[i];
    if (!node) continue;
    const cache = signatureCache.get(i);
    const stretches2 = stretchMap.get(i) || [];
    const signature = stretches2.map((s) => s.$id).sort().join(";");
    if (cache !== signature) {
      signatureCache.set(i, signature);
      stretchChanged.add(node);
    }
  }
  climb(
    updater,
    State.$roughContourChanged,
    stretchChanged
  );
}
function updater(node) {
  const stretches2 = stretchMap.get(node.id) || [];
  const nodeSets = stretches2.map((s) => s.$repo.$nodeSet);
  const criticalCorners = getCriticalCorners(node, nodeSets);
  const traceContours = [];
  for (const roughContour2 of node.$graphics.$roughContours) {
    traceContours.push(toTraceContour(node, roughContour2, criticalCorners));
  }
  node.$graphics.$traceContours = traceContours;
  for (const contour of node.$graphics.$patternContours) {
    contour.$for = void 0;
  }
  State.$contourWillChange.add(node);
  for (const stretch of stretches2) {
    if (!State.$repoToProcess.has(stretch.$repo)) {
      getOrSetEmptyArray(State.$repoToPartiallyProcess, stretch.$repo).push(node);
    }
  }
  return false;
}
function getCriticalCorners(node, nodeSets) {
  const result = [];
  for (const nodeSet of nodeSets) {
    const quadrants2 = nodeSet.$quadrantCoverage.get(node) || [];
    for (const quadrant of quadrants2) {
      const flap = quadrant.$flap;
      const d = flap.$dist - node.$dist + node.$length;
      const p = quadrant.$corner(d);
      const signature = cornerSignature(p, quadrant.q);
      result.push({
        $signature: signature,
        $flap: flap.id,
        $nodeSet: nodeSet
      });
    }
  }
  return result;
}
function cornerSignature(p, dir) {
  return p.x + "," + p.y + "," + dir;
}
function toTraceContour(node, roughContour2, criticalCorners) {
  const leaves = roughContour2.$leaves;
  const result = {
    $outer: roughContour2.$outer,
    $inner: [],
    $leaves: leaves,
    $raw: false
  };
  if (leaves.length > 1) {
    const cornerArray = criticalCorners.filter((c) => leaves.includes(c.$flap));
    const corners = /* @__PURE__ */ new Map();
    for (const c of cornerArray) corners.set(c.$signature, c);
    if (!checkCriticalCorners(result.$outer, corners)) {
      const nodeSets = [...corners.values()].map((c) => c.$nodeSet);
      result.$outer = createRawContour(node, nodeSets, leaves, roughContour2.$children);
      result.$raw = true;
    }
  }
  const children = roughContour2.$children.map((r) => r.$trace);
  if (result.$raw) {
    result.$inner = children.flatMap((c) => {
      const outer = c.$outer.map((o) => o.concat());
      outer.forEach((o) => o.leaves = c.$leaves);
      return outer;
    });
  } else {
    const outers = children.flatMap((t) => t.$raw ? t.$outer.map((o) => [o]) : [t.$outer]);
    result.$inner = aaUnion.$get(...outers);
  }
  roughContour2.$trace = result;
  return result;
}
function checkCriticalCorners(result, corners) {
  for (const path of result) {
    const dirs = mapDirections(path);
    for (const [i, p] of path.entries()) {
      corners.delete(cornerSignature(p, dirs[i]));
    }
  }
  return corners.size == 0;
}
function createRawContour(node, nodeSets, leaves, children) {
  const tree = State.m.$tree;
  const remainingLeaves = new Set(leaves);
  const result = [];
  const leafSets = createLeafSets(nodeSets, remainingLeaves);
  const sharedLeaves = /* @__PURE__ */ new Set();
  for (const leafSet of leafSets) {
    if (leafSet.hasOverlapping) {
      for (const id of leafSet) sharedLeaves.add(id);
    } else {
      let outers = leafSet.map((id) => createRawContourForLeaf(node, tree.$nodes[id]));
      if (outers.length > 1) outers = aaUnion.$get(...outers.map((p) => [p]));
      result.push(...packPaths(outers, leafSet));
    }
  }
  for (const id of sharedLeaves) {
    result.push(...packPaths([createRawContourForLeaf(node, tree.$nodes[id])], [id]));
  }
  if (remainingLeaves.size > 0) {
    const paths = recursiveExpand(node, children, remainingLeaves, node.$length);
    const outers = expander.$get(paths);
    result.push(...packPaths(outers, [...remainingLeaves]));
  }
  return result;
}
function createLeafSets(nodeSets, remainingLeaves) {
  const leafSets = nodeSets.map((nodeSet) => nodeSet.$leaves.filter((id) => remainingLeaves.has(id)));
  const leafMap = /* @__PURE__ */ new Map();
  for (const leafSet of leafSets) {
    for (const id of leafSet) {
      remainingLeaves.delete(id);
      if (leafMap.has(id)) {
        leafMap.get(id).hasOverlapping = true;
        leafSet.hasOverlapping = true;
        break;
      } else {
        leafMap.set(id, leafSet);
      }
    }
  }
  return leafSets;
}
function recursiveExpand(node, children, remainingLeaves, length) {
  const result = [];
  for (const child of children) {
    const leaves = child.$leaves.filter((id) => remainingLeaves.has(id));
    if (leaves.length == 1) {
      result.push(createRawContourForLeaf(node, State.m.$tree.$nodes[leaves[0]]));
    } else if (leaves.length == child.$leaves.length) {
      result.push(...child.$outer.map((o) => expandPath(o, length)));
    } else if (leaves.length > 0) {
      const unit = State.m.$tree.$nodes[child.$id].$length;
      result.push(...recursiveExpand(node, child.$children, remainingLeaves, length + unit));
    }
  }
  return result;
}
function packPaths(outers, leaves) {
  outers = outers.map(simplify2);
  outers.forEach((o) => o.leaves = leaves);
  return outers;
}
function createRawContourForLeaf(node, leaf) {
  const outer = leaf.$graphics.$roughContours[0].$outer[0];
  const l = leaf.$dist - node.$dist - leaf.$length + node.$length;
  const result = expandPath(outer, l);
  const coveredJunctions = coveredJunctionMap.get(leaf.id);
  if (!coveredJunctions) return result;
  const final = [];
  const quadrants2 = [];
  for (const junction2 of coveredJunctions) {
    const code = junction2.$a === leaf ? junction2.$q1 : junction2.$q2;
    quadrants2[getQuadrant(code)] = junction2.$o;
  }
  for (let q = 0; q < quadrantNumber; q++) {
    const p = result[q];
    const rect = quadrants2[q];
    if (!rect) {
      final.push(p);
    } else {
      let { x, y } = rect;
      if (x > l) x = l;
      if (y > l) y = l;
      const f = getFactors(q);
      const pxy = { x: p.x - f.x * x, y: p.y - f.y * y };
      const py = { x: p.x, y: pxy.y };
      const px = { x: pxy.x, y: p.y };
      if (q % 2) final.push(px, pxy, py);
      else final.push(py, pxy, px);
    }
  }
  return final;
}

// ../bp-studio/box-pleating-studio/src/shared/data/unionFind/unionFind.ts
var UnionFind = class {
  /**
   * @param size The projected element number limit.
   * Pay attention that an error will occur if the number of elements exceed this limit later on.
   */
  constructor(size) {
    this._length = 0;
    this._map = /* @__PURE__ */ new Map();
    this._element = new Array(size);
    this._parent = createArray(size, -1);
    this._size = createArray(size, 1);
  }
  /** Add a single element as its own set. */
  $add(element) {
    let index = this._map.get(element);
    if (index !== void 0) return index;
    index = this._length++;
    this._map.set(element, index);
    this._element[index] = element;
    return index;
  }
  /**
   * Signal that the two elements are in the same set.
   * The elements will be added to the list when in need.
   *
   * For the best performance in general,
   * here we don't check the trivial case where a === b.
   * Whoever uses this method should perform the check itself
   * if such case is frequently possible.
   */
  $union(a, b) {
    const i = this._findRecursive(this.$add(a));
    const j = this._findRecursive(this.$add(b));
    if (i === j) return;
    if (this._size[i] < this._size[j]) this._pointTo(i, j);
    else this._pointTo(j, i);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _pointTo(i, j) {
    this._parent[i] = j;
    this._size[j] += this._size[i];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _findRecursive(cursor) {
    const parent = this._parent[cursor];
    if (parent === -1) return cursor;
    const result = this._findRecursive(parent);
    this._parent[cursor] = result;
    return result;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/data/unionFind/listUnionFind.ts
var ListUnionFind = class extends UnionFind {
  /**
   * @param size The projected element number limit.
   * Pay attention that an error will occur if the number of elements exceed this limit later on.
   */
  constructor(size) {
    super(size);
    this._firstChild = createArray(size, -1);
    this._nextSibling = createArray(size, -1);
  }
  /** List all sets. */
  $list() {
    const result = [];
    for (let i = 0; i < this._length; i++) {
      if (this._parent[i] === -1) {
        const set = this._collectRecursive(i, []);
        result.push(set);
      }
    }
    return result;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _pointTo(i, j) {
    super._pointTo(i, j);
    this._nextSibling[i] = this._firstChild[j];
    this._firstChild[j] = i;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _collectRecursive(i, result) {
    result.push(this._element[i]);
    let cursor = this._firstChild[i];
    while (cursor !== -1) {
      this._collectRecursive(cursor, result);
      cursor = this._nextSibling[cursor];
    }
    return result;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/classes/chainer/unionChainer.ts
var UnionChainer = class extends Chainer {
  constructor() {
    super(...arguments);
    /** The set of known source indices of each chain */
    this._sources = [];
  }
  _reset(size) {
    super._reset(size);
    this._sources = [];
  }
  _chainToPath(id, segment) {
    const path = super._chainToPath(id, segment);
    path.from = this._sources[id];
    return path;
  }
  _createChain(segment) {
    super._createChain(segment);
    const id = this._chains;
    this._sources[id] = segment.$polygon;
  }
  _removeChain(id) {
    if (id < this._chains) {
      this._sources[id] = this._sources[this._chains];
    }
    super._removeChain(id);
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/polyBool/aaUnion/roughUnion.ts
var RoughUnion = class extends AAUnion {
  constructor() {
    super(true);
    this._chainer = new UnionChainer();
  }
  $union(...components) {
    const result = this.$get(...components);
    return this._unionFind.$list().map((from) => {
      const paths = result.filter((p) => from.includes(p.from));
      return { paths, from };
    });
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _initialize(components) {
    this._unionFind = new ListUnionFind(components.length);
    super._initialize(components);
  }
  _setInsideFlag(event, prev) {
    super._setInsideFlag(event, prev);
    const source = event.$segment.$polygon;
    if (!event.$isInside && event.$wrapDelta === 1) {
      this._unionFind.$add(source);
    } else {
      const prevSource = prev.$segment.$polygon;
      if (source !== prevSource) this._unionFind.$union(source, prevSource);
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/tasks/roughContour.ts
var roughUnion = new RoughUnion();
var roughContourTask = new Task(roughContour, traceContourTask);
function roughContour() {
  climb(
    updater2,
    State.$nodeAABBChanged,
    State.$parentChanged,
    State.$childrenChanged,
    State.$lengthChanged
  );
}
function updater2(node) {
  if (!node.$parent) {
    node.$graphics.$roughContours = [];
    return false;
  }
  if (node.$isLeaf) {
    const path = node.$AABB.$toPath();
    node.$graphics.$roughContours = [{
      $id: node.id,
      $outer: [path],
      $children: [],
      $leaves: [node.id]
    }];
  } else {
    const children = [...node.$children].flatMap((c) => c.$graphics.$roughContours);
    const contours = expand(children, node.$length, node.id);
    node.$graphics.$roughContours = contours;
  }
  State.$roughContourChanged.add(node);
  return true;
}
function expand(inputs, units, id = 0) {
  const components = roughUnion.$union(...inputs.map((c) => {
    const result = [];
    for (const outer of c.$outer) {
      if (outer.isHole) {
        const inputSpan = span(outer);
        if (inputSpan <= units * 2) {
          continue;
        }
      }
      const expanded = expandPath(outer, units);
      result.push(expanded);
    }
    return result;
  }));
  const contours = [];
  for (const component of components) {
    contours.push(componentToContour(id, inputs, component));
  }
  return contours;
}
function componentToContour(id, inputs, component) {
  const outers = component.paths.map(simplify2);
  const children = component.from.map((i) => inputs[i]);
  const leaves = children.flatMap((c) => c.$leaves);
  return { $id: id, $outer: outers, $children: children, $leaves: leaves };
}
function span(path) {
  let xMin = Number.POSITIVE_INFINITY, xMax = Number.NEGATIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY, yMax = Number.NEGATIVE_INFINITY;
  for (const p of path) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }
  return Math.min(xMax - xMin, yMax - yMin);
}

// ../bp-studio/box-pleating-studio/src/core/design/context/treeUtils.ts
function dist(a, b, lca) {
  return a.$dist + b.$dist - 2 * lca.$dist;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/junction/invalidJunction.ts
var intersection = new RRIntersection();
var InvalidJunction = class {
  constructor(a, b, d) {
    this.$valid = false;
    /** If the same {@link InvalidJunction} has already been drawn. */
    this.$processed = false;
    this.$a = a;
    this.$b = b;
    this._dist = d - a.$length - b.$length;
  }
  /**
   * Calculates and returns the {@link ArcPolygon} region of the invalid overlapping.
   *
   * Of course we could also perform this calculation in the constructor,
   * but we deliberately perform this in {@link invalidJunctionTask},
   * so that we may observe its performance.
   */
  $getPolygon() {
    const A = this.$a.$AABB, B = this.$b.$AABB;
    const result = intersection.$get(A.$toRoundedRect(0), B.$toRoundedRect(this._dist));
    if (this._dist > 0) result.push(...intersection.$get(A.$toRoundedRect(this._dist), B.$toRoundedRect(0)));
    this.$processed = true;
    return result;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/geometry/rectangle.ts
var Rectangle = class {
  constructor(p1, p2) {
    if (p1.x > p2.x) [p1, p2] = [p2, p1];
    if (p1.y > p2.y) [p1, p2] = [{ x: p1.x, y: p2.y }, { x: p2.x, y: p1.y }];
    [this.p1, this.p2] = [p1, p2];
  }
  $contains(that) {
    return this.p1.x <= that.p1.x && this.p1.y <= that.p1.y && this.p2.x >= that.p2.x && this.p2.y >= that.p2.y;
  }
  eq(that) {
    return same(this.p1, that.p1) && same(this.p2, that.p2);
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/junction/validJunction.ts
var ValidJunction = class {
  constructor(a, b, data) {
    this.$valid = true;
    /** All {@link ValidJunction}s that covers self geometrically. */
    this._geometricallyCoveredBy = [];
    this.$a = a;
    this.$b = b;
    this.$lca = data.lca;
    this.$s = data.s;
    this.$o = data.o;
    this.$f = data.f;
    this.$tip = data.tip;
    this.$q1 = makeQuadrantCode(a.id, data.dir);
    this.$q2 = makeQuadrantCode(b.id, opposite(data.dir));
  }
  toJSON() {
    return {
      c: [
        { type: 4 /* flap */, e: this.$a.id, q: getQuadrant(this.$q1) },
        { type: 2 /* side */ },
        { type: 4 /* flap */, e: this.$b.id, q: getQuadrant(this.$q2) },
        { type: 2 /* side */ }
      ],
      f: this.$f,
      ox: this.$o.x,
      oy: this.$o.y,
      sx: this.$s.x
    };
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  get $orientedIds() {
    const [a, b] = [this.$a.id, this.$b.id];
    return this.$f.x > 0 ? [a, b] : [b, a];
  }
  /**
   * Whether self is "practically" covered by another {@link ValidJunction}.
   *
   * The notion of practical covering is one step further of geometrical covering.
   * If A covers B, B covers C, and C is not covered by any other {@link ValidJunction}s other than B,
   * then since B will be invalidated by A, the covering of B over C also doesn't count,
   * so practically C is not really covered. And so on.
   */
  get $isCovered() {
    if (this._isCovered === void 0) {
      const that = this._geometricallyCoveredBy.find((j) => !j.$isCovered);
      this._isCovered = Boolean(that);
    }
    return this._isCovered;
  }
  /** Get all {@link ValidJunction}s covering the current one. */
  $getCovering() {
    return this._geometricallyCoveredBy.filter((j) => !j.$isCovered);
  }
  $involves(id) {
    return this.$a.id == id || this.$b.id == id;
  }
  /** Signal a geometrical covering. */
  $setGeometricallyCoveredBy(that) {
    this._geometricallyCoveredBy.push(that);
  }
  /** Clear covering data. */
  $resetCovering() {
    this._geometricallyCoveredBy.length = 0;
    this._isCovered = void 0;
  }
  /**
   * This method is mainly used in the case where the comparison rectangles are of the same size.
   * In that case, the junction corresponding to the closer flap should cover the other one.
   *
   * v0.7: Note that if the comparison rectangles are not of the same size,
   * then the result can mutually be `true`.
   */
  $isCloserThan(that) {
    return this.$s.x < that.$s.x || this.$s.y < that.$s.y;
  }
  /** Based on the given canonical distance to get the comparison rectangle. */
  $getBaseRectangle(distanceToA) {
    const x = this.$tip.x + distanceToA * this.$f.x;
    const y = this.$tip.y + distanceToA * this.$f.y;
    return new Rectangle({ x, y }, { x: x - this.$o.x * this.$f.x, y: y - this.$o.y * this.$f.y });
  }
  /** Create a {@link JJunction} matching the given transformation. */
  $toOrientedJSON(f) {
    const result = this.toJSON();
    if (result.f.x !== f.x) {
      result.f = f;
      [result.c[0], result.c[2]] = [result.c[2], result.c[0]];
    }
    return result;
  }
};
function getStructureSignature(junctions) {
  return JSON.stringify(junctions.map((junction2) => junction2.toJSON()));
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/junction/junction.ts
function createJunction(a, b, lca) {
  if (a.id > b.id) [a, b] = [b, a];
  const d = dist(a, b, lca);
  const [t1, r1, b1, l1] = a.$AABB.$toValues();
  const [t2, r2, b2, l2] = b.$AABB.$toValues();
  const x = l2 - r1, y = b2 - t1;
  const sx = Math.max(l1 - r2, x);
  const sy = Math.max(b1 - t2, y);
  if (sx <= 0 || sy <= 0 || sx * sx + sy * sy < d * d) {
    return new InvalidJunction(a, b, d);
  }
  const s = { x: sx, y: sy };
  const o = { x: d - sx, y: d - sy };
  const f = { x: Math.sign(x), y: Math.sign(y) };
  const dir = (f.x == f.y ? 0 : 1) + (y > 0 ? 0 : 2);
  const tip = a.$AABB.$points[dir];
  return new ValidJunction(a, b, { lca, s, o, f, dir, tip });
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/invalidJunction.ts
var invalidJunctionTask = new Task(invalid);
function invalid() {
  for (const junction2 of State.$junctions.values()) {
    if (junction2.$valid) continue;
    const a = junction2.$a.id, b = junction2.$b.id;
    State.$invalidJunctionDiff.$add(a, b);
    if (junction2.$processed) continue;
    UpdateResult.$addJunction(`${a},${b}`, junction2.$getPolygon());
  }
  for (const [a, b] of State.$invalidJunctionDiff.$diff()) {
    UpdateResult.$removeJunction(`${a},${b}`);
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/pattern.ts
var patternTask = new Task(pattern, traceContourTask);
function pattern() {
  for (const repo of State.$newRepositories) repo.$init();
  for (const device of State.$movedDevices) device.$updatePosition();
  for (const repo of State.$repoToProcess) {
    const id = repo.$stretch.$id;
    if (repo.$pattern) {
      UpdateResult.$addStretch(id, repo.$stretch.toJSON());
    } else {
      UpdateResult.$removeStretch(id);
    }
  }
  for (const s of State.$stretches.values()) {
    if (!s.$repo.$isValid) continue;
    if (!s.$repo.$pattern) {
      UpdateResult.$setPatternNotFound();
      continue;
    }
    for (const q of s.$repo.$quadrants.keys()) {
      State.$patternedQuadrants.add(q);
    }
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/store.ts
var Store = class {
  constructor(generator) {
    this._entries = [];
    /** Whether the {@link _generator} has been exhausted. */
    this._done = false;
    this._generator = generator;
  }
  get $done() {
    return this._done;
  }
  /** The number of entries, or `undefined` if not completed yet. */
  get $length() {
    return this._done ? this.$entries.length : void 0;
  }
  /** The array of the generated entries (may be incomplete). */
  get $entries() {
    return this._entries;
  }
  /**
   * Return a {@link Generator} for the generated entries,
   * as well as remaining entries.
   */
  *$values() {
    for (const entry of this._entries) yield entry;
    while (!this._done) {
      const entry = this.$next();
      if (entry) yield entry;
    }
  }
  /** Return the next entry, if any. */
  $next() {
    const next = this._generator.next();
    if (next.done) {
      this._done = true;
      return void 0;
    }
    const value = next.value;
    this._entries.push(value);
    return value;
  }
  /** Exhaust the generator. */
  $rest() {
    while (!this._done) this.$next();
  }
};

// ../bp-studio/box-pleating-studio/src/core/utils/cache.ts
var computeMap = /* @__PURE__ */ new WeakMap();
var Cache = class {
  constructor(compute) {
    this._has = false;
    computeMap.set(this, compute);
  }
  get value() {
    if (!this._has) {
      const compute = computeMap.get(this);
      this._value = compute();
      this._has = true;
    }
    return this._value;
  }
  clear() {
    this._has = false;
    this._value = void 0;
  }
};
function clearCaches(caches) {
  for (const c of caches) c.clear();
}

// ../bp-studio/box-pleating-studio/src/shared/utils/clone.ts
function deepAssignCore(target, source, ctx) {
  if (!(source instanceof Object)) return target;
  const keys = Object.keys(source);
  for (const key of keys) {
    const value = source[key];
    if (!(value instanceof Object)) {
      target[key] = value;
    } else if (target[key] instanceof Object && target[key] != value) {
      deepAssignCore(target[key], value, ctx);
    } else {
      target[key] = clonePolyfillCore(value, ctx);
    }
  }
  return target;
}
function clonePolyfill(source) {
  return clonePolyfillCore(source, /* @__PURE__ */ new WeakMap());
}
function clonePolyfillCore(source, ctx) {
  if (!source) return source;
  if (ctx.has(source)) return ctx.get(source);
  const target = Array.isArray(source) ? [] : {};
  ctx.set(source, target);
  return deepAssignCore(target, source, ctx);
}
var clone = typeof structuredClone === "function" ? structuredClone : clonePolyfill;

// ../bp-studio/box-pleating-studio/src/core/math/gops.ts
var Memo = /* @__PURE__ */ new Map();
function* generate(ox, oy, sx = Number.POSITIVE_INFINITY) {
  if (ox % 2 && oy % 2) return;
  const memo = getOrCreateMemo(ox, oy);
  for (const m of memo) {
    if (m.sx <= sx) yield m.p;
    else break;
  }
}
function rank(p) {
  const r1 = reduceInt(p.oy + p.v, p.oy)[0];
  const r2 = reduceInt(p.ox + p.u, p.ox)[0];
  return Math.max(r1, r2);
}
function getOrCreateMemo(ox, oy) {
  const key = getOrderedKey(ox, oy);
  const m = Memo.get(key);
  if (m) return m;
  const halfArea = ox * oy / 2;
  const array = [];
  for (
    let u = Math.floor(Math.sqrt(halfArea));
    // and search downwards. This will prioritize the most efficient gadget.
    u > 0;
    u--
  ) {
    if (halfArea % u == 0) {
      const v = halfArea / u;
      if (u == v) {
        addMemo({ ox, oy, u, v }, array);
      } else {
        const p1 = { ox, oy, u, v };
        const p2 = { ox, oy, u: v, v: u };
        const r1 = rank(p1), r2 = rank(p2);
        if (r1 > r2) {
          addMemo(p2, array);
          addMemo(p1, array);
        } else {
          addMemo(p1, array);
          addMemo(p2, array);
        }
      }
    }
  }
  Memo.set(key, array);
  return array;
}
function addMemo(p, array) {
  array.push({ p, sx: p.u + p.v + p.oy });
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/region.ts
var Region = class {
  constructor() {
    this.$axisParallels = new Cache(() => this._computeAxisParallels());
  }
  _computeAxisParallels() {
    const shape = this.$shape.value;
    const ref2 = shape.contour.find((p) => p.$isIntegral);
    const dir = this.$direction.value;
    const step = dir.$rotate90().$normalize();
    let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
    for (const p of shape.contour) {
      const units = p.$sub(ref2).$dot(step);
      if (units > max) max = units;
      if (units < min) min = units;
    }
    const ap = [];
    for (let i = Math.ceil(min); i <= Math.floor(max); i++) {
      const p = ref2.$add(step.$scale(new Fraction(i)));
      const intersections = [];
      for (const r of shape.ridges) {
        const j = r.$intersection(p, dir);
        if (j && !j.eq(intersections[0])) intersections.push(j);
        if (intersections.length == 2) {
          ap.push(new Line(...intersections));
          break;
        }
      }
    }
    return ap;
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/piece.ts
var offsets = /* @__PURE__ */ new WeakMap();
var Piece = class extends Region {
  constructor(data) {
    super();
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // Interface methods
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    this.$anchors = new Cache(() => {
      const p = this._points.value;
      const { contour } = this.$shape.value;
      return perQuadrant([
        p[0],
        getIdentical(contour, p[1]),
        p[2],
        getIdentical(contour, p[3])
      ]);
    });
    this.$direction = new Cache(() => {
      const { ox, oy, u, v } = this;
      return new Vector(oy * (ox + u), ox * (oy + v));
    });
    this.$shape = new Cache(() => {
      const contour = this._points.value.concat();
      const ridges = toLines(contour);
      if (this.detours) {
        for (const detour of this.detours) {
          this._processDetour(ridges, contour, detour);
        }
      }
      return { contour, ridges };
    });
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // Private members
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    this._points = new Cache(() => {
      const { ox, oy, u, v } = this;
      const result = [
        Point.ZERO,
        new Point(u, ox + u),
        new Point(oy + u + v, ox + u + v),
        new Point(oy + v, v)
      ];
      return result.map((p) => p.$add(this._shift.value));
    });
    this._shift = new Cache(() => {
      const offset = offsets.get(this);
      return new Vector(
        (this.shift?.x ?? 0) + offset.x,
        (this.shift?.y ?? 0) + offset.y
      );
    });
    this.ox = data.ox;
    this.oy = data.oy;
    this.u = data.u;
    this.v = data.v;
    this.detours = data.detours;
    this.shift = data.shift;
    offsets.set(this, { x: 0, y: 0 });
  }
  $offset(o) {
    const offset = offsets.get(this);
    if (same(offset, o)) return;
    offsets.set(this, o);
    this._clearCaches();
  }
  get sx() {
    return this.oy + this.u + this.v;
  }
  get sy() {
    return this.ox + this.u + this.v;
  }
  /** Reverse self under the given SCR. */
  $reverse(tx, ty) {
    const { detours, sx, sy } = this;
    let { shift: shift2 } = this;
    shift2 = shift2 || { x: 0, y: 0 };
    const s = { x: tx - sx - shift2.x, y: ty - sy - shift2.y };
    this.shift = s;
    this.detours = detours?.map(
      (c) => c.map((p) => ({ x: sx - p.x, y: sy - p.y }))
    );
  }
  /** Shrink a {@link Piece} proportionally. This will reset the cache. */
  $shrink(by) {
    this._clearCaches();
    this.ox /= by;
    this.oy /= by;
    this.u /= by;
    this.v /= by;
    return this;
  }
  /**
   * Add a {@link Piece.detour}. Resets all cached values.
   *
   * Its coordinates should not incorporate the offset.
   */
  $addDetour(detour) {
    detour = deduplicate(detour);
    if (detour.length == 1) return;
    this.detours = this.detours || [];
    this.detours.push(detour);
    this._clearCaches();
  }
  $clearDetour() {
    if (this.detours?.length) {
      this.detours = void 0;
      this._clearCaches();
    }
  }
  /**
   * Return the original contour (not including shifting and detour)
   * of this piece. Used only for constructing standard join.
   */
  get $originalContour() {
    const unshift = this._shift.value.$neg;
    return this._points.value.map((p) => p.$add(unshift));
  }
  _clearCaches() {
    clearCaches([
      this.$axisParallels,
      this.$anchors,
      this.$direction,
      this.$shape,
      this._points,
      this._shift
    ]);
  }
  _processDetour(ridges, contour, _detour) {
    const detour = _detour.map((p) => new Point(p).$add(this._shift.value));
    const start = detour[0], end = detour[detour.length - 1];
    const lines = [];
    for (let i = 0; i < detour.length - 1; i++) {
      lines.push(new Line(detour[i], detour[i + 1]));
    }
    const l = ridges.length;
    for (let i = 0; i < l; i++) {
      const eq = ridges[i].p1.eq(start);
      if (!eq && !ridges[i].$contains(start)) continue;
      for (let j = 1; j < l; j++) {
        const k = (j + i) % l;
        if (!ridges[k].p1.eq(end) && !ridges[k].$contains(end)) continue;
        const tail = k < i ? l - i : j + 1, head = j + 1 - tail;
        const pts = detour.concat();
        lines.push(new Line(end, ridges[k].p2));
        if (!eq) {
          pts.unshift(ridges[i].p1);
          lines.unshift(new Line(ridges[i].p1, start));
        }
        contour.splice(i, tail, ...pts);
        ridges.splice(i, tail, ...lines);
        contour.splice(0, head);
        ridges.splice(0, head);
        return;
      }
      debugger;
    }
  }
};
function getIdentical(contour, p) {
  return contour.includes(p) ? p : null;
}

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/clip/overlapIntersector.ts
var OverlapIntersector = class extends GeneralIntersector {
  constructor() {
    super(...arguments);
    this.$found = false;
  }
  $possibleIntersection(ev1, ev2) {
    if (ev1 && ev2 && ev1.$segment.$polygon == ev2.$segment.$polygon) return;
    super.$possibleIntersection(ev1, ev2);
  }
  _crossIntersection(ev1, ev2, pt) {
    const seg1 = ev1.$segment;
    const seg2 = ev2.$segment;
    if (seg1.$containsPtOnLine(pt, false) && seg2.$containsPtOnLine(pt, false)) this.$found = true;
  }
};

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/clip/overlap.ts
var Overlap = class _Overlap extends DivideAndCollect {
  constructor() {
    super(new GeneralEventProvider(true), new OverlapIntersector());
    this._orientation = compareOrientation;
    this._endProcessor = generalEndProcessor;
    this._shouldPickInside = true;
  }
  /**
   * Test if several paths has any overlap.
   *
   * For performance considerations, we do not check for self-intersection
   * for each path, ane one must ensure that the parameters are simple paths,
   * otherwise the algorithm will always return true in such a case.
   *
   * Note that the {@link Overlap} instance can be in a dirty state after
   * completion, so a new instance must be create on every call
   * to the {@link _test} method. We use this static method
   * to control this behavior.
   */
  static $test(...polygon) {
    const instance = new _Overlap();
    return instance._test(polygon);
  }
  /** Test if two or more oriented paths overlap. */
  _test(polygon) {
    for (const [n, path] of polygon.entries()) {
      const l = path.length;
      for (let i = 0, j = l - 1; i < l; j = i++) {
        const p1 = path[j];
        const p2 = path[i];
        const segment = new LineSegment(p1, p2, n);
        const delta = xyComparator(p1, p2) < 0 ? -1 : 1;
        this._addSegment(segment, delta);
      }
    }
    while (!this._eventQueue.$isEmpty) {
      const event = this._eventQueue.$pop();
      if (event.$isStart) this._processStart(event);
      else this._processEnd(event);
      if (this._collectedSegments.length > 1 || this._intersector.$found) return true;
    }
    return false;
  }
  _setInsideFlag(event, prev) {
    if (prev && prev.$wrapCount != 0) {
      event.$wrapCount += prev.$wrapCount;
      event.$isInside = event.$wrapCount != 0;
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/gadget.ts
var Gadget = class _Gadget {
  constructor(data) {
    /**
     * The width span between the two major anchors.
     * Note that this might be larger than the width of the SCR.
     * Used for positioning.
     */
    this.widthSpan = new Cache(
      () => Math.ceil(this.$anchorMap.value[2][0].x) - Math.floor(this.$anchorMap.value[0][0].x)
    );
    /**
     * The height span between the two major anchors.
     * Note that this might be larger than the height of the SCR.
     * Used for positioning.
     */
    this.heightSpan = new Cache(
      () => Math.ceil(this.$anchorMap.value[2][0].y) - Math.floor(this.$anchorMap.value[0][0].y)
    );
    this.$anchorMap = new Cache(
      () => makePerQuadrant((q) => {
        if (this.anchors?.[q]?.location) {
          let p = new Point(this.anchors[q].location);
          if (this.offset) p = p.$add(new Vector(this.offset));
          return [p, null];
        } else {
          if (this.pieces.length == 1) return [this.pieces[0].$anchors.value[q], 0];
          for (const [i, p] of this.pieces.entries()) {
            if (p.$anchors.value[q]) return [p.$anchors.value[q], i];
          }
          throw new Error();
        }
      })
    );
    this.$slack = new Cache(() => {
      if (!this.anchors) return perQuadrant([0, 0, 0, 0]);
      return makePerQuadrant((q) => this._getSlack(q));
    });
    this.$contour = new Cache(() => {
      const p = this.pieces;
      let contour = p[0].$shape.value.contour;
      for (let i = 1; i < p.length; i++) contour = join(contour, p[i].$shape.value.contour);
      return contour;
    });
    this.pieces = data.pieces.map((p) => new Piece(p));
    this.offset = data.offset;
    this.pieces.forEach((p) => this.offset && p.$offset(this.offset));
    this.anchors = clone(data.anchors);
  }
  /**
   * In case of relay, get the remaining x-component.
   * @param q1 {@link QuadrantDirection} of the corner being connected to, which is either 1 or 3.
   * @param q2 {@link QuadrantDirection} of the corner by the other {@link Gadget}, which is either 0 or 2.
   */
  rx(q1, q2) {
    return Math.ceil(Math.abs(this.$anchorMap.value[q1][0].x - this.$anchorMap.value[q2][0].x));
  }
  $reverseGPS() {
    const g = new _Gadget(this);
    const [p1, p2] = g.pieces;
    const sx = Math.ceil(Math.max(p1.sx, p2.sx));
    const sy = Math.ceil(Math.max(p1.sy, p2.sy));
    p1.$reverse(sx, sy);
    p2.$reverse(sx, sy);
    return g;
  }
  $addSlack(q, slack) {
    if (slack != 0) {
      this.anchors = this.anchors || [];
      this.anchors[q] = this.anchors[q] || {};
      this.anchors[q].slack = (this.anchors[q].slack ?? 0) + slack;
    }
    return this;
  }
  /**
   * Setup the necessary slack towards a connection target.
   * @param g Connection target
   * @param q1 From which {@link QuadrantDirection} (0 or 2)
   * @param q2 To which {@link QuadrantDirection} (1 or 3)
   */
  $setupConnectionSlack(g, q1, q2) {
    const c2 = g.$contour.value;
    const f = q1 == 0 ? 1 : -1;
    const step = new Vector(f, f);
    const slack = new Fraction(this._getSlack(q1));
    const v = g.$anchorMap.value[q2][0].$sub(Point.ZERO).$add(step.$scale(slack));
    const c0_shift = q1 == 0 ? v : v.$add(Point.ZERO.$sub(this.$anchorMap.value[2][0]));
    const c0 = shift(this.$contour.value, c0_shift);
    let c1 = c0;
    let s = 0;
    const path2 = toPath(c2);
    while (Overlap.$test(toPath(c1), path2)) {
      c1 = shift(c1, step);
      s++;
      if (s == OVERLAP_LIMIT) {
        console.log(this.$contour.value.map((p) => p.toString()));
        console.log(c2.map((p) => p.toString()));
        const c = this.$contour.value;
        console.log(JSON.stringify([[c.map((p) => p.$toIPoint()), c2.map((p) => p.$toIPoint())]]));
        debugger;
        throw new Error("Contour error");
      }
    }
    this.$addSlack(q1, s);
  }
  /** If the current {@link Gadget} contains the given ray. */
  $intersects(p, v) {
    const lines = toLines(this.$contour.value);
    for (const line of lines) {
      const intersection2 = getIntersection(line, p, v, true);
      if (intersection2 && !intersection2.point.eq(p)) return true;
    }
    return false;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _getSlack(q) {
    return this.anchors?.[q]?.slack ?? 0;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Static methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Simplify JSON data representation, for creating signature. */
  static $simplify(g) {
    if (g.offset && g.offset.x == 0 && g.offset.y == 0) delete g.offset;
    delete g.anchors;
    return g;
  }
};
var OVERLAP_LIMIT = 1e3;

// ../bp-studio/box-pleating-studio/src/core/math/kamiya.ts
var SLOPE = 3;
var SLACK = 0.5;
function* kamiyaHalfIntegral(o, sx) {
  if (o.ox % 2 == 0 || o.oy % 2 == 0) return;
  const doubleO = clone(o);
  doubleO.ox <<= 1;
  doubleO.oy <<= 1;
  for (const p of generate(doubleO.ox, doubleO.oy, sx * 2)) {
    if (rank(p) > SLOPE) continue;
    const p1 = new Piece(p);
    const v_even = p1.v % 2 == 0;
    if (p1.ox == p1.oy && v_even) continue;
    const { ox, oy, u, v } = p1.$shrink(2);
    const diff = Math.abs(ox - oy) / 2;
    if (!Number.isInteger(diff)) debugger;
    const sm = Math.min(ox, oy);
    let p2;
    if (v_even && ox >= oy) {
      p1.detours = [[{ x: diff, y: SLOPE * diff }, { x: oy + u + v, y: ox + u + v }]];
      p2 = {
        ox: sm,
        oy: sm,
        u: v,
        v: u - diff,
        detours: [[{ x: sm + u + v - diff, y: sm + u + v - diff }, { x: 0, y: 0 }]],
        shift: { x: diff, y: SLOPE * diff }
      };
    } else if (!v_even && oy >= ox) {
      p1.detours = [[{ x: oy + u + v, y: ox + u + v }, { x: diff * SLOPE, y: diff }]];
      p2 = {
        ox: sm,
        oy: sm,
        u: v - diff,
        v: u,
        detours: [[{ x: 0, y: 0 }, { x: sm + u + v - diff, y: sm + u + v - diff }]],
        shift: { x: diff * SLOPE, y: diff }
      };
    } else {
      continue;
    }
    const g = new Gadget({ pieces: [p1, p2] });
    const gr = g.$reverseGPS();
    yield g.$addSlack(2 /* LL */, SLACK);
    yield gr.$addSlack(0 /* UR */, SLACK);
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/deviceGenerator.ts
function* deviceGenerator(data, config) {
  const junctions = config.$repo.$junctions;
  const { overlaps, strategy } = data;
  if (overlaps.length == 1) {
    const overlap = overlaps[0];
    const { ox, oy } = overlap;
    const sx = junctions[overlap.parent].sx;
    if (strategy == "HALFINTEGRAL" /* halfIntegral */) {
      for (const g of kamiyaHalfIntegral(overlap, sx)) {
        yield { gadgets: [g] };
      }
    }
    if (strategy == "UNIVERSAL" /* universal */) {
      for (const g of universalGPS(overlap, sx)) {
        yield { gadgets: [g] };
      }
    } else {
      for (const piece of generate(ox, oy, sx)) {
        const gadget = { pieces: [piece] };
        yield { gadgets: [gadget] };
      }
    }
  } else if (overlaps.length == 2) {
    const joiner = config.$repo.$getJoiner(overlaps);
    if (strategy == "STANDARD_JOIN" /* standardJoin */) yield* joiner.$standardJoin();
    else if (strategy == "BASE_JOIN" /* baseJoin */) yield* joiner.$baseJoin();
    else yield* joiner.$simpleJoin(strategy);
  }
}
function* universalGPS(o, sx) {
  let d = 2, found = false;
  while (!found) {
    const bigO = clone(o);
    bigO.ox *= d;
    bigO.oy *= d;
    for (const p of generate(bigO.ox, bigO.oy, sx * d)) {
      const p1 = new Piece(p).$shrink(d);
      if (!Number.isInteger(p1.v)) continue;
      const { ox, oy, u, v } = p1;
      const p2 = { ox, oy, u: v, v: u };
      const pt1 = { x: 0, y: 0 }, pt2 = { x: oy + u + v, y: ox + u + v };
      p1.detours = [[pt1, pt2]];
      p2.detours = [[pt2, pt1]];
      const x = p1.oy + p1.u + p1.v, s = Math.ceil(x) - x;
      const g = new Gadget({ pieces: [p1, p2] });
      const gr = g.$reverseGPS();
      yield g.$addSlack(2 /* LL */, s);
      yield gr.$addSlack(0 /* UR */, s);
      found = true;
    }
    d += 2;
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/partition.ts
var Partition = class {
  constructor(config, data) {
    /** Choose an outward connection point in this Partition. */
    this.$displacementReference = new Cache(
      () => (
        // Choose whichever first one that is out-going
        this.$overlaps.find((o) => o.c[0].type != 5 /* coincide */).c[0]
      )
    );
    /** All {@link JCorner}s that are dragging constraints of the current {@link Partition}. */
    this.$constraints = new Cache(
      () => this.$cornerMap.filter((m) => {
        const type = m.corner.type;
        return type == 0 /* socket */ || type == 1 /* internal */ || type == 4 /* flap */;
      })
    );
    this.$externalCornerMaps = new Cache(
      () => this.$cornerMap.filter((m) => {
        const type = m.corner.type;
        return type == 2 /* side */ || type == 3 /* intersection */;
      })
    );
    this.$configuration = config;
    this.$overlaps = data.overlaps;
    if (data.overlaps[0].ox < 0) debugger;
    this.$devices = new Store(deviceGenerator(data, config));
    this._strategy = data.strategy;
    const map = [];
    for (const [i, o] of data.overlaps.entries()) {
      for (const [j, c] of o.c.entries()) {
        map.push({ corner: c, overlapIndex: i, anchorIndex: j });
      }
    }
    this.$cornerMap = map;
  }
  toJSON() {
    return {
      overlaps: this.$overlaps,
      // This is OK since the array is readonly
      strategy: this._strategy
    };
  }
  $getDisplacement(pattern2) {
    const connection = this.$displacementReference.value;
    return pattern2.$getConnectionTarget(connection).$sub(pattern2.$config.$repo.$origin);
  }
  /**
   * Get the "target" of an external connection point.
   *
   * It is in general very difficult to determine the actual extend of an external connection ridge,
   * because that depends on the overall layout of all the flaps nearby,
   * not just the two flaps involved and tree structure. Therefore,
   * we draw the external connection ridge only up to the boundary of the flap,
   * and only when the connection point is within one of the two flap regions.
   * We then leave the rest of the ridge to be drawn automatically by the turning of rivers.
   * And by the "target", we mean the intersection of the ridge and the flap boundary.
   *
   * @param point The current location of the connection point itself.
   * @param c The corresponding {@link JCorner} info.
   * @param q If given, it will force returning the connection target on the given direction.
   */
  $getExternalConnectionTarget(point, map, q) {
    let [p1, p2] = this.$getExternalConnectionTargets(map);
    if (p1._x.gt(p2._x)) [p1, p2] = [p2, p1];
    if (q === void 0) {
      if (point._x.le(p1._x)) return p1;
      if (point._x.ge(p2._x)) return p2;
      return null;
    } else {
      return q == 0 /* UR */ || q == 3 /* LR */ ? p1 : p2;
    }
  }
  /**
   * Mapping the external connection points to the two possible "targets"
   * (see {@link $getExternalConnectionTarget} for the meaning of that).
   *
   * Naively, one might think it suffices to consider the diagonal line
   * through the external connection point and locate its intersection with
   * the boundary of the two flaps, but such method would not work for
   * patterns among multiple flaps. In that case, we need to consult
   * {@link _getExposedOverlap} method in order to calculate the location of the target.
   */
  $getExternalConnectionTargets(map) {
    const tree = State.m.$tree;
    const repo = this.$configuration.$repo;
    let ov = this.$overlaps[map.overlapIndex];
    const parent = this._getParent(ov);
    const c1 = parent.c[0], c2 = parent.c[2];
    const n1 = c1.e, n2 = c2.e;
    const f1 = tree.$nodes[n1], f2 = tree.$nodes[n2];
    const quad1 = repo.$quadrants.get(makeQuadrantCode(n1, c1.q));
    const quad2 = repo.$quadrants.get(makeQuadrantCode(n2, c2.q));
    let d1 = 0, d2 = 0;
    const overlaps = this.$overlaps.concat();
    if (map.corner.type == 3 /* intersection */) {
      const oriented = ov.c[0].e < 0;
      const n3 = map.corner.e;
      const t = repo.$nodeSet.$distTriple(n1, n2, n3);
      if (oriented) d2 = t.d2 - f2.$length;
      else d1 = t.d1 - f1.$length;
      if (!this._findOverlapForFlap(n3)) {
        for (const p of this.$configuration.$partitions) {
          if (p == this) continue;
          const find = p._findOverlapForFlap(n3);
          if (find) overlaps.push(find);
        }
      }
    }
    ov = this._getExposedOverlap(ov, overlaps);
    const p1 = quad1.$getOverlapCorner(ov, parent, map.anchorIndex, d1);
    const p2 = quad2.$getOverlapCorner(ov, parent, opposite(map.anchorIndex), d2);
    return [p1, p2];
  }
  /**
   * See {@link Ridge.$division}.
   * @param q {@link QuadrantDirection} of the intersection ridge.
   */
  $resolveDivision(map) {
    const ov = this.$overlaps[map.overlapIndex];
    const parent = this.$configuration.$repo.$junctions[ov.parent];
    const n1 = parent.c[0].e;
    const n2 = parent.c[2].e;
    const n3 = map.corner.e;
    let [a, b] = [n1, n3];
    if (a > b) [a, b] = [b, a];
    const fromN1 = this.$configuration.$repo.$junctions.some((j) => j.c[0].e == a && j.c[2].e == b);
    [a, b] = [fromN1 ? n2 : n1, n3];
    if (a > b) [a, b] = [b, a];
    return [a, b];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _findOverlapForFlap(id) {
    for (const ov of this.$overlaps) {
      for (const corner of ov.c) {
        if (corner.type == 4 /* flap */ && corner.e == id) return ov;
      }
    }
  }
  /**
   * Find, in a {@link Partition} containing joins, what is left of a given {@link JOverlap}
   * after subtracting the other JOverlaps.
   */
  _getExposedOverlap(ov, overlaps) {
    if (overlaps.length == 1) return ov;
    const result = clone(ov);
    const parent = this._getParent(ov);
    let shift2 = result.shift ?? { x: 0, y: 0 };
    for (const o of overlaps) {
      if (o != ov) {
        const p = this._getParent(o);
        const w = result.ox + shift2.x;
        const h = result.oy + shift2.y;
        if (p.c[0].e == parent.c[0].e) {
          if (p.ox < parent.ox) {
            const x = Math.max(shift2.x, p.ox);
            shift2 = { x, y: shift2.y };
            result.ox = w - x;
          }
          if (p.oy < parent.oy) {
            const y = Math.max(shift2.y, p.oy);
            shift2 = { x: shift2.x, y };
            result.oy = h - y;
          }
        }
        if (p.c[2].e == parent.c[2].e) {
          if (p.ox < parent.ox) {
            result.ox = parent.ox - Math.max(p.ox, parent.ox - w) - shift2.x;
          }
          if (p.oy < parent.oy) {
            result.oy = parent.oy - Math.max(p.oy, parent.oy - h) - shift2.y;
          }
        }
      }
    }
    result.shift = shift2;
    return result;
  }
  /**
   * Obtain the original {@link JJunction} corresponding to the give {@link JOverlap}.
   */
  _getParent(ov) {
    return this.$configuration.$repo.$junctions[ov.parent];
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/addOn.ts
var AddOn = class extends Region {
  constructor(data) {
    super();
    this.$shape = new Cache(() => {
      const contour = this.contour.map((p) => new Point(p));
      const ridges = toLines(contour);
      return { contour, ridges };
    });
    this.$direction = new Cache(() => new Vector(this.dir).$reduceToInt());
    this.contour = data.contour;
    this.dir = data.dir;
  }
};

// ../bp-studio/box-pleating-studio/src/shared/utils/pattern.ts
function convertIndex(code) {
  return -code - 1;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/device.ts
var Device = class {
  constructor(pattern2, partition, data) {
    /**
     * Ridges of the {@link Region}s before transformation.
     * The result is constant, so it is cached.
     */
    this._innerRidges = new Cache(() => {
      const result = [];
      for (const region of this._regions) {
        const parallelRegions = this._regions.filter(
          (q) => q != region && q.$direction.value.$parallel(region.$direction.value)
        );
        const lines = parallelRegions.flatMap(
          (q) => q.$shape.value.ridges.filter((l) => !l.$perpendicular(q.$direction.value))
        );
        result.push(...Line.$subtract(region.$shape.value.ridges, lines));
      }
      return Line.$distinct(result);
    });
    /**
     * All neighboring {@link Device}s.
     */
    this._neighbors = new Cache(() => {
      const result = /* @__PURE__ */ new Set();
      for (const o of this.$partition.$overlaps) {
        for (const corner of o.c) {
          if (corner.type == 0 /* socket */ || corner.type == 1 /* internal */) {
            const [i] = this.$partition.$configuration.$overlapMap.get(corner.e);
            result.add(this.$pattern.$devices[i]);
          }
        }
      }
      return Array.from(result);
    });
    this.$pattern = pattern2;
    this.$partition = partition;
    this.$gadgets = data.gadgets.map((g) => new Gadget(g));
    this.$addOns = data.addOns?.map((a) => new AddOn(a)) ?? [];
    this.$offset = data.offset ?? 0;
    const regions = [];
    for (const g of this.$gadgets) regions.push(...g.pieces);
    regions.push(...this.$addOns);
    this._regions = regions;
  }
  $init() {
    this._originalDisplacement = this.$partition.$getDisplacement(this.$pattern);
    this.$updatePosition();
  }
  get $initialized() {
    return Boolean(this._originalDisplacement);
  }
  toJSON() {
    return {
      gadgets: clone(this.$gadgets),
      offset: this.$offset,
      addOns: this.$addOns.length ? this.$addOns : void 0
    };
  }
  /**
   * The distance between the first out-going anchor point
   * (see {@link Partition.$displacementReference})
   * of this device to its connection target.
   */
  get $offset() {
    let dx = this.$partition.$getDisplacement(this.$pattern).x;
    dx -= this._originalDisplacement.x;
    return (this.$location.x - dx) * this.$pattern.$config.$repo.$f.x;
  }
  set $offset(v) {
    const { x, y } = this.$pattern.$config.$repo.$f;
    this.$location = { x: v * x, y: v * y };
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public members
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /** Update parameters after the {@link Device} have moved. */
  $updatePosition() {
    const origin = this.$pattern.$config.$repo.$origin.$add(this._originalDisplacement);
    this._delta = origin.$add(new Vector(this.$location)).$sub(Point.ZERO);
    const result = [];
    for (const g of this.$gadgets) {
      result.push(g.$anchorMap.value.map((m) => this._transform(m[0])));
    }
    this.$anchors = result;
    this._clearCache();
    this._neighbors.value.forEach((n) => n._clearCache());
    this.$partition.$configuration.$onDeviceMove();
  }
  /** All ridges that should be drawn. */
  get $drawRidges() {
    const ridges = this._ridges.filter((r) => r.$type != 3 /* intersection */);
    for (const map of this.$partition.$externalCornerMaps.value) {
      if (map.corner.type != 3 /* intersection */) continue;
      const from = this.$resolveCornerMap(map);
      const to = this.$partition.$getExternalConnectionTarget(from, map);
      if (to) {
        const ridge = new Line(from, to);
        ridges.push(ridge);
      }
    }
    return ridges.map((l) => l.$toILine());
  }
  /** All ridges used for tracing */
  get $traceRidges() {
    return this._ridges.filter((r) => r.$type != 2 /* side */);
  }
  /** All axis-parallel creases that should be drawn. */
  get $axisParallels() {
    const result = [];
    for (const r of this._regions) {
      for (const l of r.$axisParallels.value) {
        result.push(this._transform(l));
      }
    }
    return result.map((l) => l.$toILine());
  }
  /** Contours for the devices. Used for drawing selection shade. */
  get $contour() {
    return this._regions.map((r) => ({
      outer: toPath(r.$shape.value.contour.map((p) => this._transform(p)))
    }));
  }
  /** The lower and upper bounds of x-coordinate that can be dragged. */
  $getDraggingRange() {
    const fx = this.$pattern.$config.$repo.$f.x;
    const result = [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    for (const c of this.$partition.$constraints.value) {
      const isOut = c.corner.type != 0 /* socket */;
      const q = isOut ? c.anchorIndex : opposite(c.corner.q);
      const f = fx * (q == 0 ? -1 : 1);
      const target = this.$pattern.$getConnectionTarget(c.corner);
      const selfSlack = this.$gadgets[c.overlapIndex].$slack.value[c.anchorIndex];
      const targetSlack = c.corner.e !== void 0 && c.corner.e < 0 ? this.$pattern.$gadgets[convertIndex(c.corner.e)].$slack.value[c.corner.q] : 0;
      const slack = isOut && c.corner.type !== 1 /* internal */ ? selfSlack : targetSlack + selfSlack;
      const bound = target.x - this.$resolveCornerMap(c).x - slack * f;
      if (f > 0 && result[1] > bound) result[1] = bound;
      else if (f < 0 && result[0] < bound) result[0] = bound;
    }
    return result;
  }
  $getConnectionRidges(internalOnly) {
    const result = [];
    for (const [i, ov] of this.$partition.$overlaps.entries()) {
      for (const [q, c] of ov.c.entries()) {
        if (c.type == 4 /* flap */ && !internalOnly || c.type == 1 /* internal */) {
          result.push(new Line(
            this.$anchors[i][q],
            this.$pattern.$getConnectionTarget(c)
          ));
        }
      }
    }
    return result;
  }
  $resolveCornerMap(map) {
    return this.$anchors[map.overlapIndex][map.anchorIndex];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private members
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _transform(obj) {
    const f = this.$pattern.$config.$repo.$f;
    return obj.$transform(f.x, f.y).$add(this._delta);
  }
  /** All ridges after considering overlapping with neighbors. */
  get _ridges() {
    if (this._ridgeCache) return this._ridgeCache;
    const neighborRidges = this._neighbors.value.flatMap((g) => g._rawRidges);
    return this._ridgeCache = Line.$subtract(this._rawRidges, neighborRidges);
  }
  /** Self-owned ridges. */
  get _rawRidges() {
    if (this._rawRidgeCache) return this._rawRidgeCache;
    const selfRidges = this._innerRidges.value.map((l) => this._transform(l));
    const outerRidges = this._getOuterRidges();
    return this._rawRidgeCache = selfRidges.concat(outerRidges);
  }
  _getOuterRidges() {
    const result = this.$getConnectionRidges(false);
    for (const map of this.$partition.$externalCornerMaps.value) {
      const from = this.$resolveCornerMap(map);
      const dir = this._resolveCornerDirection(map.corner);
      const to = this.$partition.$getExternalConnectionTarget(from, map, dir);
      if (to) {
        const ridge = new Line(from, to);
        ridge.$type = map.corner.type;
        if (map.corner.type == 3 /* intersection */) {
          ridge.$division = this.$partition.$resolveDivision(map);
        }
        result.push(ridge);
      }
    }
    return result;
  }
  _resolveCornerDirection(corner) {
    if (corner.type != 3 /* intersection */) return void 0;
    const codes = this.$partition.$configuration.$repo.$quadrants.keys();
    for (const code of codes) {
      if (getNodeId(code) == corner.e) return getQuadrant(code);
    }
    return void 0;
  }
  _clearCache() {
    this._ridgeCache = void 0;
    this._rawRidgeCache = void 0;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Static methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Generate a signature for a given list of {@link JDevice},
   * disregarding positional information.
   */
  static $getSignature(devices) {
    devices = clone(devices);
    for (const device of devices) {
      device.gadgets.forEach((g) => Gadget.$simplify(g));
      delete device.offset;
    }
    return JSON.stringify(devices);
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/positioners/singleJunctionPositioner.ts
function singleJunctionPositioner(context) {
  const devices = context.$devices;
  const overlap = devices[0].$partition.$overlaps[0];
  const junction2 = context.$junctions[overlap.parent];
  const sx = junction2.sx;
  if (devices.length == 1) {
    devices[0].$offset = Math.floor((sx - devices[0].$gadgets[0].widthSpan.value) / 2);
    return true;
  }
  if (devices.length == 2) {
    const [g1, g2] = devices.map((d) => d.$gadgets[0]);
    const o2 = devices[1].$partition.$overlaps[0];
    const tx = g2.widthSpan.value + g1.rx(o2.c[0].q, 0);
    devices[1].$offset = sx - tx;
    return true;
  }
  return false;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/positioners/twoJunctionPositioner.ts
function twoJunctionPositioner(context) {
  if (context.$devices.length == 1) {
    pushJoinDeviceTowardsJoint(context, context.$devices[0]);
    return true;
  }
  if (context.$devices.length == 2 && context.$overlaps.length == 2) {
    return makeTwoDeviceRelayPattern(context);
  }
  return makeSpitJoinPattern(context);
}
function makeTwoDeviceRelayPattern(context) {
  let [g1, g2] = context.$gadgets;
  let [o1, o2] = context.$overlaps;
  const reversed = o2.c[0].e >= 0 && o2.c[2].e >= 0;
  if (reversed) {
    [g1, g2] = [g2, g1];
    [o1, o2] = [o2, o1];
  }
  const [j1, j2] = [o1, o2].map((o) => context.$junctions[o.parent]);
  const oriented = o2.c[0].e < 0;
  const deltaPt = context.$getRelativeDelta(j1, j2, g1);
  if (g1.$intersects(deltaPt, oriented ? QV[0] : QV[2])) return false;
  const slack = Math.floor(g2.$slack.value[oriented ? 0 : 2]);
  const offsets2 = oriented ? [0, slack] : [j1.sx - g1.widthSpan.value, j2.sx - context.$getSpan(g2, 2) - g2.widthSpan.value - slack];
  if (reversed) offsets2.reverse();
  context.$devices.forEach((d, i) => d.$offset = offsets2[i]);
  return true;
}
function makeSpitJoinPattern(context) {
  const nonJoin = context.$devices.filter((device) => {
    if (device.$gadgets.length > 1) {
      pushJoinDeviceTowardsJoint(context, device);
      return false;
    }
    return true;
  });
  for (const device of nonJoin) {
    const overlap = device.$partition.$overlaps[0];
    const j = context.$getJunctions(device)[0];
    const qOut = overlap.c[0].e < 0 ? 0 : 2;
    const corner = overlap.c[qOut];
    const gadget = device.$gadgets[0];
    const index = convertIndex(corner.e);
    const q = corner.q;
    const targetCorner = device.$pattern.$config.$overlaps[index].c[q];
    let offset = j.sx - context.$getSpan(gadget, qOut) - gadget.widthSpan.value;
    if (targetCorner.type == 0 /* socket */) {
      offset += device.$pattern.$gadgets[index].$slack.value[q];
    }
    if (offset < gadget.$slack.value[qOut]) return false;
    if (qOut == 0) device.$offset = offset;
  }
  return true;
}
function pushJoinDeviceTowardsJoint(context, device) {
  const [j1, j2] = context.$getJunctions(device);
  const oriented = j1.c[0].e == j2.c[0].e;
  if (!oriented) {
    const gadget = device.$gadgets[0];
    device.$offset = j1.sx - context.$getSpan(gadget, 0) - gadget.widthSpan.value;
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/positioners/positioningContext.ts
var PositioningContext = class {
  constructor(pattern2) {
    this._slackMap = /* @__PURE__ */ new WeakMap();
    this._spanCache = { 0: /* @__PURE__ */ new Map(), 2: /* @__PURE__ */ new Map() };
    this.$repo = pattern2.$config.$repo;
    this.$junctions = this.$repo.$junctions;
    this.$devices = pattern2.$devices;
    this.$overlaps = pattern2.$config.$overlaps;
    this.$gadgets = pattern2.$gadgets;
    for (let i = 0; i < this.$overlaps.length; i++) {
      this._setupSlackForOverlap(i);
    }
  }
  $getRelativeDelta(j1, j2, g) {
    const oriented = j1.c[0].e == j2.c[0].e;
    const r = this.$repo.$getMaxIntersectionDistance(j1, j2, oriented);
    if (j2.ox > j1.ox) [j1, j2] = [j2, j1];
    let p = { x: r - j2.ox, y: r - j1.oy };
    if (!oriented) p = { x: g.widthSpan.value - p.x, y: g.heightSpan.value - p.y };
    return new Point(p);
  }
  $getJunctions(device) {
    return device.$partition.$overlaps.map((o) => this.$junctions[o.parent]);
  }
  $checkJunctions(singleMode) {
    if (this.$junctions.length == 1 && this.$gadgets.length == 1) return true;
    if (singleMode) {
      const index = this.$overlaps[0].parent;
      return this._checkJunction(index);
    }
    for (let i = 0; i < this.$junctions.length; i++) {
      if (!this._checkJunction(i)) return false;
    }
    return true;
  }
  /**
   * Get the span of a {@link Gadget} towards a given {@link TipDirection},
   * but exclude the immediate slack for the sake of convenience.
   */
  $getSpan(g, q) {
    const index = this.$gadgets.indexOf(g);
    return this._getSpan(index, q) - this._getSlack(index, q);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _setupSlackForOverlap(index) {
    const overlap = this.$overlaps[index];
    const id = convertIndex(index);
    for (let q = 0; q < quadrantNumber; q++) {
      const corner = overlap.c[q];
      if (corner.type != 1 /* internal */) continue;
      const targetIndex = convertIndex(corner.e);
      const targetOverlap = this.$overlaps[targetIndex];
      const oppositeCorner = targetOverlap.c[2 - q];
      const mutual = oppositeCorner.type == 1 /* internal */ && oppositeCorner.e == id;
      const g1 = this.$gadgets[index];
      const g2 = this.$gadgets[targetIndex];
      if (!mutual) {
        g1.$setupConnectionSlack(g2, q, corner.q);
      } else {
        const tx1 = g1.widthSpan.value + g2.rx(q, corner.q);
        const tx2 = g2.widthSpan.value + g1.rx(2 - q, opposite(corner.q));
        if (tx2 > tx1) this._slackMap.set(corner, tx2 - tx1);
      }
    }
  }
  /**
   * Given a {@link JJunction}, consider all possible {@link Gadget} chains within,
   * and make sure that all chains fit the space.
   */
  _checkJunction(index) {
    const junction2 = this.$junctions[index];
    const overlapIndices = /* @__PURE__ */ new Set();
    for (let i = 0; i < this.$overlaps.length; i++) {
      const ov = this.$overlaps[i];
      if (ov.parent != index) continue;
      overlapIndices.add(i);
    }
    let maxSpan = 0;
    const callback = (i) => overlapIndices.delete(i);
    while (overlapIndices.size > 0) {
      const first = getFirst(overlapIndices);
      overlapIndices.delete(first);
      const result = this.$gadgets[first].widthSpan.value + this._getSpan(first, 0, callback) + this._getSpan(first, 2, callback);
      if (result > maxSpan) maxSpan = result;
    }
    return junction2.sx >= maxSpan;
  }
  _getSpan(index, q, callback) {
    if (this._spanCache[q].has(index)) {
      return this._spanCache[q].get(index);
    }
    let result = 0;
    const next = this._getNextIndex(index, q);
    if (next !== null) {
      if (callback) callback(next);
      const corner = this.$overlaps[index].c[q];
      if (corner.type == 1 /* internal */) {
        const nextGadget = this.$gadgets[next];
        const slack = this._getSlack(index, q);
        result += nextGadget.rx(q, corner.q) + slack;
      }
      result += this._getSpan(next, q, callback);
    }
    this._spanCache[q].set(index, result);
    return result;
  }
  _getSlack(index, q) {
    const corner = this.$overlaps[index].c[q];
    const gadget = this.$gadgets[index];
    return this._slackMap.get(corner) ?? Math.floor(gadget.$slack.value[q]);
  }
  _getNextIndex(index, q) {
    const corner = this.$overlaps[index].c[q];
    if (corner.type == 4 /* flap */) return null;
    return convertIndex(corner.e);
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/pattern/pattern.ts
var Pattern = class {
  /**
   * @param seeded Signify that this is a seeded pattern, and positioning is not needed.
   */
  constructor(config, devices, seeded) {
    /** A flag indicating the origin needs to be updated. */
    this.$originDirty = false;
    this.$config = config;
    this.$devices = devices.map((d, i) => new Device(this, config.$partitions[i], d));
    this.$gadgets = this.$devices.flatMap((d) => d.$gadgets);
    this.$valid = seeded ? true : this._position();
    if (!this.$valid) return;
    const devicesToInitialize = new Set(this.$devices);
    while (devicesToInitialize.size > 0) {
      for (const device of devicesToInitialize) {
        const c = device.$partition.$displacementReference.value;
        if (c.e >= 0 || this._getDeviceOfConnection(c).$initialized) {
          device.$init();
          devicesToInitialize.delete(device);
        }
      }
    }
  }
  toJSON() {
    return {
      devices: this.$devices.map((device) => device.toJSON())
    };
  }
  /** Return the actual {@link Point} to which the given {@link JConnection} connects. */
  $getConnectionTarget(c) {
    if (c.e >= 0) {
      return new Point(State.m.$tree.$nodes[c.e].$AABB.$points[c.q]);
    } else {
      const [i, j] = this.$config.$overlapMap.get(c.e);
      return this.$devices[i].$anchors[j][c.q];
    }
  }
  $tryUpdateOrigin() {
    if (!this.$originDirty) return;
    this.$devices.forEach((d) => State.$movedDevices.add(d));
    this.$originDirty = false;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _position() {
    const context = new PositioningContext(this);
    const singleMode = this.$config.$singleMode;
    if (!context.$checkJunctions(singleMode)) return false;
    if (singleMode || context.$junctions.length == 1) {
      return singleJunctionPositioner(context);
    }
    if (context.$junctions.length == 2) {
      return twoJunctionPositioner(context);
    }
    return false;
  }
  _getDeviceOfConnection(c) {
    return this.$devices[this.$config.$overlapMap.get(c.e)[0]];
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/patternGenerator.ts
function* patternGenerator(config, proto) {
  let protoSignature;
  if (proto && proto.patterns && proto.patterns.length) {
    if (typeof proto.index == "number") {
      for (const pattern3 of proto.patterns) {
        yield new Pattern(config, pattern3.devices, true);
      }
      return;
    }
    const pattern2 = new Pattern(config, proto.patterns[0].devices, true);
    if (pattern2.$valid) {
      const devices = pattern2.$devices.map((device) => device.toJSON());
      protoSignature = Device.$getSignature(devices);
      yield pattern2;
    }
  }
  const buffer = new Array(config.$partitions.length);
  for (const devices of recursiveDeviceGenerator(config.$partitions, 0, buffer)) {
    if (protoSignature) {
      const signature = Device.$getSignature(devices);
      if (signature == protoSignature) {
        protoSignature = void 0;
        continue;
      }
    }
    const pattern2 = new Pattern(config, devices);
    if (pattern2.$valid) yield pattern2;
  }
}
function* recursiveDeviceGenerator(partitions, depth, buffer) {
  const partition = partitions[depth];
  for (const device of partition.$devices.$values()) {
    buffer[depth] = device;
    if (depth + 1 < partitions.length) {
      yield* recursiveDeviceGenerator(partitions, depth + 1, buffer);
    } else {
      yield buffer.concat();
    }
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/configuration.ts
var Configuration = class {
  constructor(repo, config, singleMode = false) {
    /** Whether the origin needs to be updated. */
    this.$originDirty = false;
    /** Current index of the selected {@link Pattern}. */
    this._index = 0;
    this.$repo = repo;
    this.$singleMode = singleMode;
    let partitions = config.partitions;
    if (config.raw) {
      this._rawPartitions = partitions;
      partitions = cleanUp2(clone(partitions));
    }
    this.$partitions = partitions.map((p) => new Partition(this, p));
    const overlaps = [];
    const overlapMap = /* @__PURE__ */ new Map();
    let k = -1;
    for (const [i, p] of partitions.entries()) {
      for (const [j, o] of p.overlaps.entries()) {
        overlaps.push(o);
        overlapMap.set(k--, [i, j]);
      }
    }
    this.$overlaps = overlaps;
    this.$overlapMap = overlapMap;
    this._patterns = new Store(patternGenerator(this, config));
    if (typeof config.index == "number") {
      this._patterns.$rest();
      this._index = config.index;
    } else {
      this._patterns.$next();
    }
  }
  toJSON(session) {
    return {
      partitions: this.$partitions.map((partition) => partition.toJSON()),
      patterns: session && this._patterns.$entries.map((pattern2) => pattern2.toJSON()),
      index: session && this._index
    };
  }
  get $signature() {
    return JSON.stringify(this.toJSON());
  }
  get $index() {
    return this._index;
  }
  set $index(v) {
    this._index = v;
    this._freeCornerCache = void 0;
    this.$pattern?.$tryUpdateOrigin();
  }
  get $length() {
    return this._patterns.$length;
  }
  get $patterns() {
    return this._patterns.$entries;
  }
  get $pattern() {
    const patterns = this.$patterns;
    if (patterns.length === 0) return null;
    return patterns[this._index];
  }
  /** Raw {@link JPartition}s. */
  get $rawPartitions() {
    return this._rawPartitions;
  }
  $onDeviceMove() {
    this._freeCornerCache = void 0;
  }
  $complete() {
    this._patterns.$rest();
  }
  $tryUpdateOrigin() {
    if (!this.$originDirty) return;
    this._patterns.$entries.forEach((p) => p.$originDirty = true);
    this.$pattern?.$tryUpdateOrigin();
    this.$originDirty = false;
    this.$onDeviceMove();
  }
  /**
   * {@link SideDiagonal}s have special significance in the tracing algorithm,
   * so we make a special getter for that.
   */
  get $sideDiagonals() {
    const result = [];
    for (const { map, corner, partition } of this.$freeCorners) {
      if (map.corner.type != 2 /* side */) continue;
      let diagonal = new Line(...partition.$getExternalConnectionTargets(map));
      if (diagonal.$isDegenerated) diagonal = new Line(diagonal.p1, corner);
      diagonal.p0 = corner;
      result.push(diagonal);
    }
    return result;
  }
  /**
   * Get all {@link FreeCorner}s in the current {@link Configuration}.
   *
   * The value is cached whenever applicable to provide performance.
   */
  get $freeCorners() {
    if (this._freeCornerCache) return this._freeCornerCache;
    const result = [];
    for (const [i, partition] of this.$partitions.entries()) {
      for (const map of partition.$cornerMap) {
        if (map.corner.type == 2 /* side */ || map.corner.type == 3 /* intersection */) {
          const corner = this.$pattern.$devices[i].$resolveCornerMap(map);
          result.push({ map, corner, partition });
        }
      }
    }
    return this._freeCornerCache = result;
  }
};
function cleanUp2(partitions) {
  const idMap = /* @__PURE__ */ new Map();
  const overlaps = partitions.flatMap((p) => p.overlaps);
  for (let i = 0; i < overlaps.length; i++) {
    idMap.set(overlaps[i].id, convertIndex(i));
    delete overlaps[i].id;
  }
  const corners = overlaps.flatMap((o) => o.c);
  for (const corner of corners) {
    if (corner.e !== void 0 && corner.e < 0) {
      corner.e = idMap.get(corner.e);
    }
  }
  return partitions;
}

// ../bp-studio/box-pleating-studio/src/core/utils/generator.ts
var GeneratorUtil;
((GeneratorUtil2) => {
  function* $first(generators, filter) {
    for (const generator of generators) {
      let found = false;
      for (const value of generator) {
        const check = filter(value);
        if (check) yield value;
        if (check !== false) found = true;
      }
      if (found) return;
    }
  }
  GeneratorUtil2.$first = $first;
})(GeneratorUtil || (GeneratorUtil = {}));

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/filters.ts
function createConfigFilter(signature) {
  return (config) => {
    if (signature === config.$signature) return;
    return config.$pattern != null;
  };
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/singleConfigGenerator.ts
function* singleConfigGenerator(context, index, protoSignature) {
  yield* GeneratorUtil.$first([
    singleGadget(context, index),
    doubleRelay(context, index),
    singleGadget(context, index, "HALFINTEGRAL" /* halfIntegral */),
    singleGadget(context, index, "UNIVERSAL" /* universal */)
  ], createConfigFilter(protoSignature));
}
function* singleGadget(context, index, strategy) {
  const j = context.$repo.$junctions[index];
  const partitions = [{
    overlaps: [context.$toOverlap(j, index)],
    strategy
  }];
  yield context.$make(partitions, true);
}
function* doubleRelay(context, index) {
  const j = context.$repo.$junctions[index];
  const make = (overlaps) => context.$make(overlaps.map((o) => ({ overlaps: [o] })), true);
  if (j.ox * j.oy % 2) return;
  if (j.ox < j.oy) {
    for (let y = 1; y <= j.oy / 2; y++) {
      const c = make(context.$cut(j, index, 0, y));
      if (c.$pattern) {
        yield c;
        yield make(context.$cut(j, index, 0, j.oy - y));
      }
    }
  } else {
    for (let x = 1; x <= j.ox / 2; x++) {
      const c = make(context.$cut(j, index, x, 0));
      if (c.$pattern) {
        yield c;
        yield make(context.$cut(j, index, j.ox - x, 0));
      }
    }
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/configGeneratorContext.ts
var ConfigGeneratorContext = class {
  constructor(repo) {
    this.$singleMode = false;
    this._nextId = -1;
    this.$repo = repo;
    this._junctions = repo.$junctions;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Cut a {@link JJunction} into two, either vertically or horizontally.
   *
   * @param index The index of this {@link JJunction}.
   * @param id The next available index of the {@link JOverlap}.
   * The resulting indices of the cutting will go decreasingly from this number.
   */
  $cut(j, index, x, y) {
    const o1 = this.$toOverlap(j, index), o2 = this.$toOverlap(j, index);
    if (o1.id === void 0 || o2.id === void 0) debugger;
    if (x > 0) {
      o1.c[2] = { type: 1 /* internal */, e: o2.id, q: 3 };
      o1.c[1] = { type: 0 /* socket */, e: o2.id, q: 0 };
      o1.ox = x;
      o2.c[3] = { type: 0 /* socket */, e: o1.id, q: 2 };
      o2.c[0] = { type: 1 /* internal */, e: o1.id, q: 1 };
      o2.ox = j.ox - x;
      o2.shift = { x, y: 0 };
    } else {
      o1.c[2] = { type: 1 /* internal */, e: o2.id, q: 1 };
      o1.c[3] = { type: 0 /* socket */, e: o2.id, q: 0 };
      o1.oy = y;
      o2.c[1] = { type: 0 /* socket */, e: o1.id, q: 2 };
      o2.c[0] = { type: 1 /* internal */, e: o1.id, q: 3 };
      o2.oy = j.oy - y;
      o2.shift = { x: 0, y };
    }
    return [o1, o2];
  }
  /** Convert a {@link JJunction} to a {@link JOverlap}. */
  $toOverlap(j, parentIndex) {
    return {
      id: this._nextId--,
      c: clone(j.c),
      ox: j.ox,
      oy: j.oy,
      parent: parentIndex
    };
  }
  /**
   * Replace temporary id to real id and construct a new {@link Configuration}.
   * @param single See {@link Configuration.$singleMode}.
   */
  $make(partitions, single) {
    if (single && this.$singleMode) {
      return new Configuration(this.$repo, { partitions, raw: true }, true);
    } else {
      cleanUp2(partitions);
      return new Configuration(this.$repo, { partitions });
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/searchUtils/relay.ts
function* searchRelay(items, o1, o2, s1, s2) {
  const oriented = o1.c[2].e == o2.c[2].e;
  if (o1.ox > o2.ox) [o1, o2] = [o2, o1];
  if (o1.id === void 0 || o2.id === void 0) debugger;
  if (!items[0].split) {
    yield makeXRelay(clone(o1), clone(o2), oriented, s1, s2);
    if (s1 !== s2) yield makeXRelay(clone(o1), clone(o2), oriented, s2, s1);
  }
  if (!items[1].split) {
    yield makeYRelay(clone(o1), clone(o2), oriented, s1, s2);
    if (s1 !== s2) yield makeYRelay(clone(o1), clone(o2), oriented, s2, s1);
  }
}
function getRelayParameters(oriented) {
  return oriented ? [0, 1, 2, 3] : [2, 3, 0, 1];
}
function makeXRelay(o1, o2, oriented, s1, s2) {
  o2.ox -= o1.ox;
  const [a, b, c, d] = getRelayParameters(oriented);
  o2.c[c] = { type: 1 /* internal */, e: o1.id, q: d };
  o2.c[b] = { type: 3 /* intersection */, e: o1.c[a].e };
  o1.c[d] = { type: 0 /* socket */, e: o2.id, q: c };
  if (!oriented) o2.shift = { x: o1.ox, y: 0 };
  return [
    { overlaps: [o1], strategy: s1 },
    { overlaps: [o2], strategy: s2 }
  ];
}
function makeYRelay(o1, o2, oriented, s1, s2) {
  o1.oy -= o2.oy;
  const [a, b, c, d] = getRelayParameters(oriented);
  o1.c[c] = { type: 1 /* internal */, e: o2.id, q: b };
  o1.c[d] = { type: 3 /* intersection */, e: o2.c[a].e };
  o2.c[b] = { type: 0 /* socket */, e: o1.id, q: c };
  if (!oriented) o1.shift = { x: 0, y: o2.oy };
  return [
    { overlaps: [o1], strategy: s1 },
    { overlaps: [o2], strategy: s2 }
  ];
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/searchUtils/splitJoin.ts
function cover(o1, o2) {
  return o1.ox >= o2.ox && o1.oy >= o2.oy;
}
function toSplitItems(item, nodeId) {
  return item.configs.map((config) => toSplitItem(config, nodeId, item.oppositeNodeId));
}
function toSplitItem(config, nodeId, oppositeNodeId) {
  const partitions = config.$rawPartitions;
  const overlaps = partitions.map((p2) => p2.overlaps[0]);
  if (partitions.length == 1) return { overlap: overlaps[0], oppositeNodeId };
  const isHorizontal = overlaps[0].ox == overlaps[1].ox;
  const p = partitions.find((partition) => {
    const overlap2 = partition.overlaps[0];
    return overlap2.c[0].e == nodeId || overlap2.c[2].e == nodeId;
  });
  const remainingPartition = partitions.find((partition) => partition != p);
  const overlap = p.overlaps[0];
  return { overlap, oppositeNodeId, split: { remainingPartition, isHorizontal } };
}
function getExposedPart(item, against, join2) {
  if (!item.split) return;
  const itemIsTaller = item.overlap.oy > against.overlap.oy;
  const isHorizontal = item.split.isHorizontal;
  const splittingOnOutside = itemIsTaller == isHorizontal;
  const result = clone(item.split.remainingPartition);
  if (!splittingOnOutside) {
    if (isHorizontal) {
      result.overlaps[0].ox -= against.overlap.ox;
    } else {
      result.overlaps[0].oy -= against.overlap.oy;
    }
    for (const i of [0, 1]) {
      const overlap = join2.overlaps[i];
      for (let q = 0; q < quadrantNumber; q++) {
        if (overlap.c[q].type == 3 /* intersection */) {
          const overlapIsSelf = overlap.parent == item.overlap.parent;
          replaceIntersectionCorner(
            result.overlaps[0],
            overlap,
            q,
            overlapIsSelf ? overlap.id : join2.overlaps[1 - i].id,
            against.oppositeNodeId
          );
        }
      }
    }
  }
  return result;
}
function replaceIntersectionCorner(from, to, q, socketOverlapId, againstFlapId) {
  const overlapIsSelf = socketOverlapId == to.id;
  const target = to.c[q];
  const q_ = overlapIsSelf ? q : quadrantNumber - q;
  const source = from.c[q_];
  source.type = 3 /* intersection */;
  if (overlapIsSelf) {
    source.e = target.e;
  } else {
    source.e = againstFlapId;
  }
  target.type = 0 /* socket */;
  target.e = from.id;
  for (const [i, c] of from.c.entries()) {
    if (c.type == 1 /* internal */ && c.e == socketOverlapId) {
      target.q = i;
      c.e = to.id;
      c.q = q;
    }
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/generalConfigGeneratorContext.ts
var MAX_RANK_PER_JOINT = 9;
var RELAY_RANK = 1;
var BASE_JOIN_RANK = 4;
var STANDARD_JOIN_RANK = 6;
var HALF_INTEGRAL_RANK = 7;
var UNIVERSAL_RANK = 8;
var GeneralConfigGeneratorContext = class extends ConfigGeneratorContext {
  constructor(repo) {
    super(repo);
    this.$singleMode = true;
    const junctionMap = /* @__PURE__ */ new Map();
    const configs = [];
    for (const [i, junction2] of this._junctions.entries()) {
      const c1 = junction2.c[0], c2 = junction2.c[2];
      getOrSetEmptyArray(junctionMap, makeQuadrantCode(c1.e, c1.q)).push(i);
      getOrSetEmptyArray(junctionMap, makeQuadrantCode(c2.e, c2.q)).push(i);
      configs[i] = [...singleConfigGenerator(this, i)];
    }
    const joints = [];
    let maxRank = 0;
    for (const code of junctionMap.keys()) {
      const junctionIndices = junctionMap.get(code);
      if (junctionIndices.length > 1) {
        const max = (junctionIndices.length - 1) * MAX_RANK_PER_JOINT;
        const nodeId = getNodeId(code);
        joints.push({
          nodeId,
          q: getQuadrant(code),
          max,
          items: junctionIndices.map((i) => {
            const j = this._junctions[i];
            return {
              index: i,
              junction: j,
              oppositeNodeId: j.c[0].e == nodeId ? j.c[2].e : j.c[0].e,
              configs: configs[i],
              split: configs[i][0] && configs[i][0].$partitions.length > 1
            };
          })
        });
        maxRank += max;
      }
    }
    this._joints = joints;
    this.$maxRank = maxRank;
  }
  /**
   * To not overwhelm ourselves, let's put some conditions to restrict the processing
   * to previously solved cases, and then we will progressively allow more cases.
   *
   * TODO: allowing more cases here.
   */
  $checkPreconditions() {
    if (this._joints.length > 1) return false;
    if (this._joints[0].items.length != 2) return false;
    return true;
  }
  *$rankCombination(targetRank, ranks = []) {
    if (targetRank < 0) return;
    const depth = ranks.length;
    const joint = this._joints[depth];
    if (depth == this._joints.length - 1) {
      if (targetRank <= joint.max) yield ranks.concat(targetRank);
    } else {
      for (let rank2 = 0; rank2 <= joint.max && rank2 <= targetRank; rank2++) {
        yield* this.$rankCombination(targetRank - rank2, ranks.concat(rank2));
      }
    }
  }
  /**
   * This is the starting point of the pattern searching algorithm.
   */
  *$search(ranks) {
    const joint = this._joints[0];
    const rank2 = ranks[0];
    if (rank2 >= RELAY_RANK) {
      yield* this._searchRelay(joint.items, rank2 - RELAY_RANK);
    }
    const splitCount = joint.items.filter((item) => item.split).length;
    if (splitCount == 0) {
      const partitions = this._searchJoinPartitions(() => this._itemsToOverlaps(joint.items), rank2);
      for (const partition of partitions) {
        yield this.$make([partition]);
      }
    } else if (rank2 >= splitCount) {
      yield* this._searchSplitJoin(joint, rank2 - splitCount);
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  *_searchRelay(items, rank2) {
    let strategy;
    if (rank2 == UNIVERSAL_RANK) strategy = "UNIVERSAL" /* universal */;
    else if (rank2 == HALF_INTEGRAL_RANK) strategy = "HALFINTEGRAL" /* halfIntegral */;
    else if (rank2 != 0) return;
    const [o1, o2] = this._itemsToOverlaps(items);
    for (const partitions of searchRelay(items, o1, o2, strategy)) {
      yield this.$make(partitions);
    }
  }
  *_searchJoinPartitions(factory, rank2) {
    yield* this._searchJoin(factory(), rank2);
    if (rank2 > 2) yield* this._searchRelayJoin(factory(), rank2 - 1);
  }
  *_searchJoin(overlaps, rank2) {
    const strategy = resolveJoinRank(rank2);
    if (!strategy && rank2 != 2) return;
    for (let i = 1; i < overlaps.length; i++) {
      const [o1, o2] = [overlaps[0], overlaps[i]];
      const oriented = o1.c[0].e == o2.c[0].e;
      this._joinOverlaps(o1, o2, oriented);
    }
    yield { overlaps, strategy };
  }
  *_searchRelayJoin(overlaps, rank2) {
    const strategy = resolveJoinRank(rank2);
    if (!strategy && rank2 != 2) return;
    const [o1, o2] = overlaps;
    const oriented = o1.c[0].e == o2.c[0].e;
    const o1x = o2.ox > o1.ox;
    const x = (o1x ? o1 : o2).ox, y = (o1x ? o2 : o1).oy;
    for (let n = 1; n < x; n++) {
      const [o1p, o2p] = clone([o1, o2]);
      const o = this._joinOverlaps(o1p, o2p, oriented, !o1x);
      o.ox -= n;
      if (oriented) o.shift = { x: n, y: 0 };
      yield { overlaps: [o1p, o2p], strategy };
    }
    for (let n = 1; n < y; n++) {
      const [o1p, o2p] = clone([o1, o2]);
      const o = this._joinOverlaps(o1p, o2p, oriented, o1x);
      o.oy -= n;
      if (oriented) o.shift = { x: 0, y: n };
      yield { overlaps: [o1p, o2p], strategy };
    }
  }
  *_searchSplitJoin(joint, rank2) {
    joint.splitItems ||= joint.items.map((i) => toSplitItems(i, joint.nodeId));
    for (const item1 of joint.splitItems[0]) {
      for (const item2 of joint.splitItems[1]) {
        if (item1.split?.isHorizontal == item2.split?.isHorizontal) continue;
        const o1 = item1.overlap, o2 = item2.overlap;
        if (cover(o1, o2) || cover(o2, o1)) continue;
        const joins = this._searchJoinPartitions(() => clone([o1, o2]), rank2);
        for (const join2 of joins) {
          const partitions = [join2];
          const remain1 = getExposedPart(item1, item2, join2);
          const remain2 = getExposedPart(item2, item1, join2);
          if (remain1) partitions.push(remain1);
          if (remain2) partitions.push(remain2);
          yield this.$make(partitions);
        }
      }
    }
  }
  /** This method should be called each time to create new {@link JOverlap} instances. */
  _itemsToOverlaps(items) {
    return items.map((item) => this.$toOverlap(item.junction, item.index));
  }
  /**
   * Setup parameters to join {@link o2} onto {@link o1}.
   *
   * @param oriented The shared corner of {@link o1} and {@link o2} is on the lower left
   * @param reverse Join in the reversed way ({@link o1} onto {@link o2})
   *
   * @returns Whichever {@link JOverlap} that joins onto the other.
   */
  _joinOverlaps(o1, o2, oriented, reverse2 = false) {
    if (reverse2) [o1, o2] = [o2, o1];
    const c = oriented ? 0 /* UR */ : 2 /* LL */;
    const offset = o2.ox > o1.ox ? previousQuadrantOffset : nextQuadrantOffset;
    const q = (offset + c) % quadrantNumber;
    o2.c[c] = { type: 5 /* coincide */, e: o1.id, q: c };
    const other = this._junctions[o1.parent].c[opposite(c)].e;
    o2.c[q] = { type: 3 /* intersection */, e: other };
    o1.c[opposite(q)] = { type: 5 /* coincide */, e: o2.id, q };
    return o2;
  }
};
function resolveJoinRank(rank2) {
  if (rank2 == 0) return "PERFECT" /* perfect */;
  if (rank2 == BASE_JOIN_RANK) return "BASE_JOIN" /* baseJoin */;
  if (rank2 == STANDARD_JOIN_RANK) return "STANDARD_JOIN" /* standardJoin */;
  return void 0;
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/generalConfigGenerator.ts
function* generalConfigGenerator(repo, protoSignature) {
  const context = new GeneralConfigGeneratorContext(repo);
  if (!context.$checkPreconditions()) return;
  const generators = [];
  for (let rank2 = 0; rank2 <= context.$maxRank; rank2++) {
    generators.push(generateConfig(context, rank2));
  }
  yield* GeneratorUtil.$first(generators, createConfigFilter(protoSignature));
}
function* generateConfig(context, targetRank) {
  for (const combination of context.$rankCombination(targetRank)) {
    yield* context.$search(combination);
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/generators/configGenerator.ts
function* configGenerator(repo, prototype) {
  let protoSignature;
  if (prototype) {
    if (prototype.repo) {
      for (const config of prototype.repo.configurations) {
        yield new Configuration(repo, config);
      }
      return;
    }
    const proto = prototype.configuration;
    const pattern2 = prototype.pattern;
    if (proto && pattern2) {
      try {
        const jConfig = { partitions: proto.partitions, patterns: [pattern2] };
        const config = new Configuration(repo, jConfig);
        if (!config.$pattern) throw new Error();
        protoSignature = config.$signature;
        yield config;
      } catch {
        console.log("Incompatible old version.");
      }
    }
  }
  if (!repo.$isValid) return;
  if (repo.$junctions.length === 1) {
    const context = new ConfigGeneratorContext(repo);
    yield* singleConfigGenerator(context, 0, protoSignature);
  } else {
    yield* generalConfigGenerator(repo, protoSignature);
  }
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/nodeSet.ts
var NodeSet = class {
  constructor(junctions, quadrants2) {
    this.$leaves = getLeaves(junctions);
    const heap = new BinaryHeap(maxDistComparator);
    const coverage = /* @__PURE__ */ new Map();
    const numQuadrants = quadrants2.size;
    for (const id of this.$leaves) {
      const leaf = State.m.$tree.$nodes[id];
      heap.$insert(leaf);
      const covered = [];
      for (let q = 0; q < quadrantNumber; q++) {
        const quadrant = quadrants2.get(leaf.id << 2 | q);
        if (quadrant) covered.push(quadrant);
      }
      coverage.set(leaf, covered);
    }
    const nodes = [];
    if (junctions.length > 1) this._lcaMap = new IntDoubleMap();
    while (!heap.$isEmpty) {
      const node = heap.$pop();
      const coveredQuadrants = coverage.get(node);
      if (coveredQuadrants.length == numQuadrants) {
        coverage.delete(node);
        continue;
      }
      nodes.push(node.id);
      const parent = node.$parent;
      if (!parent) continue;
      const parentCoverage = getOrSetEmptyArray(coverage, parent, () => heap.$insert(parent));
      if (this._lcaMap && parentCoverage.length) {
        for (const A of parentCoverage) {
          for (const B of coveredQuadrants) this._lcaMap.set(A.$flap.id, B.$flap.id, parent);
        }
      }
      parentCoverage.push(...coveredQuadrants);
    }
    nodes.sort(minComparator);
    this.$quadrantCoverage = coverage;
    this.$nodes = nodes;
  }
  /**
   * Given the ids of three flaps, return the distance from each of them to their branching node.
   */
  $distTriple(i1, i2, i3) {
    const tree = State.m.$tree;
    const n1 = tree.$nodes[i1];
    const n2 = tree.$nodes[i2];
    const n3 = tree.$nodes[i3];
    const d12 = this._dist(n1, n2);
    const d13 = this._dist(n1, n3);
    const d23 = this._dist(n2, n3);
    const total = (d12 + d13 + d23) / 2;
    return {
      d1: total - d23,
      d2: total - d13,
      d3: total - d12
    };
  }
  /**
   * Compare two node sets, and return if anything has changed.
   */
  $compare(that) {
    if (that.$nodes.length != this.$nodes.length) return true;
    for (let i = 0; i < this.$nodes.length; i++) {
      if (this.$nodes[i] != that.$nodes[i]) return true;
      const node = State.m.$tree.$nodes[this.$nodes[i]];
      if (State.$lengthChanged.has(node)) return true;
    }
    return false;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _dist(a, b) {
    return dist(a, b, this._lca(a, b));
  }
  _lca(a, b) {
    const lcaMap = this._lcaMap;
    let lca = lcaMap.get(a.id, b.id);
    if (!lca) {
      const aLeaf = this.$quadrantCoverage.get(a)[0].$flap.id;
      const bLeaf = this.$quadrantCoverage.get(b)[0].$flap.id;
      lca = lcaMap.get(aLeaf, bLeaf);
      lcaMap.set(a.id, b.id, lca);
    }
    return lca;
  }
};
function getLeaves(junctions) {
  const leafSet = /* @__PURE__ */ new Set();
  for (const j of junctions) {
    leafSet.add(j.$a.id);
    leafSet.add(j.$b.id);
  }
  const leaves = Array.from(leafSet);
  leaves.sort(minComparator);
  return leaves;
}

// ../bp-studio/box-pleating-studio/src/core/math/geometry/winding.ts
function isInside(point, path) {
  return windingNumber(point, path, false) != 0;
}
function windingNumber(point, path, boundary) {
  let result = 0;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const pi = path[i], pj = path[j];
    const left = isLeft(pj, pi, point);
    if (!boundary && left == 0) return 0;
    if (pj.y <= point.y) {
      if (pi.y > point.y && left > 0) result++;
    } else {
      if (pi.y <= point.y && left < 0) result--;
    }
  }
  return result;
}
function isLeft(p0, p1, p2) {
  return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/joinee.ts
var Joinee = class {
  constructor(p, offset, anchors, pt, q, additionalOffset = Vector.ZERO) {
    this.p = p;
    this._offset = offset;
    this._anchors = anchors;
    this._v = new Vector(offset).$add(additionalOffset).$neg;
    this._pt = pt.$add(this._v).$toIPoint();
    this.e = p.$shape.value.ridges[q].$shift(additionalOffset);
  }
  $setupDetour(rawDetour, reverse2) {
    const detour = rawDetour.map((p) => p.$add(this._v).$toIPoint());
    detour.push(this._pt);
    if (reverse2) detour.reverse();
    this.p.$clearDetour();
    this.p.$addDetour(detour);
  }
  /**
   * We need to be careful that the point may not be on the boundary,
   * otherwise our join algorithm will create non-simple gadgets,
   * which will end up in big trouble in {@link Gadget.$setupConnectionSlack}
   * as the overlap test will then always return true.
   *
   * TODO: But do such non-simple gadget make sense in practice?
   */
  $contains(p) {
    return isInside(p.$add(this._v), this.p.$originalContour);
  }
  $toGadget(shouldClone, oriented, offset) {
    let off = this._offset;
    if (offset) {
      off = { x: off.x + offset.x, y: off.y + offset.y };
    }
    if (off.x == 0 && off.y == 0) off = void 0;
    const result = new Gadget({
      pieces: [shouldClone ? clone(this.p) : this.p],
      offset: off,
      anchors: this._anchors.concat()
      // need to make a copy here
    });
    for (const q of [1 /* UL */, 3 /* LR */]) {
      const p = result.$anchorMap.value[q][0];
      if (!p.$isIntegral) {
        const x = p.x;
        const fractionalPart = x - Math.floor(x);
        const slack = oriented ? 1 - fractionalPart : fractionalPart;
        result.$addSlack(q, slack);
      }
    }
    return result;
  }
  $isSteeperThan(that) {
    return this.p.$direction.value.$slope.gt(that.p.$direction.value.$slope);
  }
  $setupAnchor(upperLeft, anchor) {
    const q = upperLeft ? 1 /* UL */ : 3 /* LR */;
    this._anchors[q] = { location: anchor.$add(this._v).$toIPoint() };
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/joineeBuilder.ts
var JoineeBuilder = class {
  constructor(p, q, _joiner) {
    this.p = p;
    this.q = q;
    this._joiner = _joiner;
    this._anchors = [];
    this._offset = { x: 0, y: 0 };
  }
  /**
   * This is the most complicated part of constructing a {@link Joinee}.
   */
  $setup(that, f, shift2, sx) {
    const int2 = this._joiner.$getRelayJoinIntersection(that.p, shift2, opposite(this.q));
    if (!int2 || !int2.$isIntegral) return NaN;
    const rx = this._joiner.$oriented ? int2.x : that.p.sx - int2.x;
    if (this.p.sx + rx > sx) return NaN;
    let offset;
    if (this._joiner.$oriented) {
      this._offset = offset = int2.$toIPoint();
      this.p.$offset(offset);
      this._anchors[this._joiner.q] = {
        location: { x: -offset.x, y: -offset.y }
      };
      return offset.x;
    } else {
      const target = f == 1 ? that : this;
      target._offset = offset = { x: f * (that.p.sx - int2.x), y: f * (that.p.sy - int2.y) };
      target.p.$offset(offset);
      this._anchors[this._joiner.q] = {
        location: { x: this.p.sx + f * offset.x, y: this.p.sy + f * offset.y }
      };
      return f * offset.x;
    }
  }
  set $additionalOffset(offset) {
    this._additionalOffset = new Vector(offset);
  }
  get $anchor() {
    let a = this.p.$anchors.value[this._joiner.q];
    if (this._additionalOffset) a = a.$add(this._additionalOffset);
    return a;
  }
  get $jAnchor() {
    return new Point(this._anchors[this._joiner.q].location);
  }
  $build(pt) {
    return new Joinee(
      this.p,
      this._offset,
      this._anchors,
      pt,
      this.q,
      this._additionalOffset
    );
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/logic/joinLogic.ts
var EXTRA_SIZE_WEIGHT = 10;
var JoinLogic = class {
  constructor(joiner, p1, p2) {
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // Protected members
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    this._deltaPt = new Cache(() => {
      const { org } = this.data;
      const { j1, j2, f } = this;
      const { $isClockwise: cw, $intersectionDist: $intDist } = this.joiner;
      return new Point(
        org.x + ($intDist - (cw ? j2.p : j1.p).ox) * f,
        org.y + ($intDist - (cw ? j1.p : j2.p).oy) * f
      );
    });
    const { $oriented, s1, s2, q1, q2, w1, w2 } = this.joiner = joiner;
    let size = p1.sx + p2.sx;
    const builder1 = new JoineeBuilder(p1, q1, joiner);
    const builder2 = new JoineeBuilder(p2, q2, joiner);
    if (s1) size += builder1.$setup(builder2, 1, s1, w1);
    if (s2) size += builder2.$setup(builder1, -1, s2, w2);
    if (isNaN(size)) return;
    let offset;
    if (!$oriented) builder2.$additionalOffset = offset = { x: p1.sx - p2.sx, y: p1.sy - p2.sy };
    const pt = s1 ? builder1.$anchor : builder2.$anchor;
    const bv = new Vector(
      p1.ox * p2.u + p2.ox * p1.u + 2 * p1.u * p2.u,
      p1.ox * p2.ox + p1.ox * p2.u + p2.ox * p1.u
    );
    this.f = $oriented ? 1 : -1;
    let org = Point.ZERO;
    if (!$oriented) org = s1 ? builder1.$jAnchor : builder1.$anchor;
    this.j1 = builder1.$build(pt);
    this.j2 = builder2.$build(pt);
    this.data = { offset, size, pt, bv, org };
  }
  /**
   * Setup the {@link Piece.detours} for the two {@link Piece}s.
   *
   * The input arrays are listed starting with the vertex far most
   * from the joining point, and not including the joining point itself.
   */
  _setupDetour(dt1, dt2) {
    const { j1, j2 } = this;
    const shouldReverse = this.joiner.$isClockwise;
    j1.$setupDetour(dt1, !shouldReverse);
    j2.$setupDetour(dt2, shouldReverse);
  }
  /**
   * Setup the intersection anchor by the given point,
   * and return whether it was successful.
   */
  _setupAnchor(a) {
    const { j1, j2, f } = this;
    const { $oriented, $isClockwise: cw } = this.joiner;
    if (a.x * f > this._deltaPt.value.x * f) return false;
    j1.$setupAnchor($oriented != cw, a);
    j2.$setupAnchor($oriented == cw, a);
    return true;
  }
  /**
   * Generated {@link JoinResult}.
   * @param shouldClone Whether the piece should be cloned.
   */
  _result(shouldClone = false, extraSize = 0) {
    const { offset, size, addOns } = this.data;
    const { j1, j2 } = this;
    const oriented = this.joiner.$oriented;
    this.data.addOns = void 0;
    const g1 = j1.$toGadget(shouldClone, oriented);
    const g2 = j2.$toGadget(shouldClone, oriented, offset);
    return [
      { gadgets: [g1, g2], addOns },
      size + extraSize * EXTRA_SIZE_WEIGHT
    ];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Debug methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /// #if DEBUG
  /* istanbul ignore next: debug */
  static debugContour(g1, g2) {
    const pt = new Point(new Fraction(429, 7), new Fraction(520, 7));
    const c1 = new Gadget(g1).$contour.value;
    const c2 = new Gadget(g2).$contour.value;
    if (c1.some((p) => p.eq(pt)) || c2.some((p) => p.eq(pt))) {
      console.log(JSON.stringify([[c1.map((p) => p.$toIPoint())], [c2.map((p) => p.$toIPoint())]]));
      debugger;
    }
  }
  /// #endif
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/logic/simpleJoinLogic.ts
var SimpleJoinLogic = class extends JoinLogic {
  *$join() {
    if (!this.data) return;
    const { pt, bv } = this.data;
    const { j1, j2 } = this;
    const int2 = j1.e.$intersectLine(j2.e);
    if (!int2) return;
    if (!int2.$sub(pt).$parallel(bv)) return;
    if (!this._setupAnchor(int2)) return;
    this._setupDetour([int2], [int2]);
    yield this._result();
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/logic/baseJoinLogic.ts
var BaseJoinLogic = class extends JoinLogic {
  *$join() {
    if (!this.data) return;
    const { D1, D2, B1, B2 } = this._baseJoinIntersections();
    const try1 = this.tryJoin(B1, D2, true, true);
    if (try1) yield try1;
    const try2 = this.tryJoin(B2, D1, false, false);
    if (try2) yield try2;
  }
  /**
   * Find the four critical intersections of the base join.
   *
   * It's worth mentioning that those four intersections doesn't always present.
   * If the angles of the two {@link Gadget} are very "steep",
   * chances are that only one pair will show up.
   */
  _baseJoinIntersections() {
    const { bv, pt } = this.data;
    const { j1, j2 } = this;
    const deltaPt = this._deltaPt.value;
    const delta = new Line(deltaPt, QV[0]);
    const D1 = j1.e.$intersection(deltaPt, QV[0]);
    const D2 = j2.e.$intersection(deltaPt, QV[0]);
    const B1 = j1.e.$intersection(pt, bv);
    const B2 = j2.e.$intersection(pt, bv);
    return { D1, D2, B1, B2, delta };
  }
  tryJoin(B, D, Din2, shouldClone) {
    const { j1, j2, f } = this;
    if (!B || !D) return;
    if (B.$isIntegral && D.$isIntegral && !B.eq(D)) {
      if (D.x * f > B.x * f && this.joiner.$isClockwise != j1.$isSteeperThan(j2)) return;
      if (!this._setupAnchor(D)) return;
      if (Din2) this._setupDetour([B], [D, B]);
      else this._setupDetour([D, B], [B]);
      return this._result(shouldClone);
    }
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/logic/standardJoinLogic.ts
var StandardJoinLogic = class extends BaseJoinLogic {
  *$join() {
    if (!this.data) return;
    const { D1, D2, B1, B2, delta } = this._baseJoinIntersections();
    const { f } = this;
    if (B1 && D2 && !B1.eq(D2)) {
      if (D2.x * f > B1.x * f) yield* this._convexStandardJoin(B1, D2, 0);
      else yield* this._concaveStandardJoin(B1, D2, 1, delta);
    }
    if (B2 && D1 && !B2.eq(D1)) {
      if (D1.x * f > B2.x * f) yield* this._convexStandardJoin(B2, D1, 1);
      else yield* this._concaveStandardJoin(B2, D1, 0, delta);
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Convex standard join.
   */
  *_convexStandardJoin(B, D, i) {
    if (B.$isIntegral) return;
    const { j1, j2 } = this;
    const e = i ? j2.e : j1.e;
    const p = i ? j2.p : j1.p;
    if (this.joiner.$isClockwise != j1.$isSteeperThan(j2)) return;
    if (!this._setupAnchor(D)) return;
    const tryResult = this._tryConvexTransform(e, B, D, i);
    if (!tryResult) return;
    const [T, R] = tryResult;
    this.data.addOns = [{
      contour: [D, T, R].map((point) => point.$toIPoint()),
      dir: new Line(T, R).$reflect(p.$direction.value).$toIPoint()
    }];
    this._setupDetour([i ? D : T, R], [i ? T : D, R]);
    yield this._result(true, R.$dist(T));
  }
  _tryConvexTransform(e, B, D, i) {
    const { pt } = this.data;
    const { j1, j2, f } = this;
    const P = D.$sub(B).$slope.gt(Fraction.ONE) ? e.$xIntersection(D.x) : e.$yIntersection(D.y);
    const gridPoints = closestGridPoints(this._substituteEnd(e, B), D);
    for (const T of gridPoints) {
      if (T.eq(e.p1) || T.eq(e.p2)) continue;
      const R = triangleTransform([D, P, B], T);
      if (!R || R.x * f < pt.x * f) continue;
      if (!(i ? j1 : j2).$contains(R)) continue;
      return [T, R];
    }
    return null;
  }
  /**
   * Concave standard join.
   */
  *_concaveStandardJoin(B, D, i, delta) {
    if (D.$isIntegral) return;
    const { j1, j2 } = this;
    const e = i ? j2.e : j1.e;
    const p = i ? j2.p : j1.p;
    const T = closestGridPoints(this._substituteEnd(e, D), B)[0];
    if (T.eq(e.p1) || T.eq(e.p2)) return;
    const P = D.$sub(B).$slope.gt(Fraction.ONE) ? delta.$yIntersection(T.y) : delta.$xIntersection(T.x);
    const R = triangleTransform([T, D, P], B);
    if (!R || !this._setupAnchor(R)) return;
    this.data.addOns = [{
      contour: [B, T, R].map((point) => point.$toIPoint()),
      dir: new Line(T, B).$reflect(p.$direction.value).$toIPoint()
    }];
    this._setupDetour(i ? [B] : [T, B], i ? [T, B] : [B]);
    yield this._result(true, B.$dist(T));
  }
  /**
   * Change one the endpoints of the critical edge to the B-intersection,
   * in order to get the actual edge before transforming.
   */
  _substituteEnd(e, p) {
    const [p1, p2] = e.$xOrient();
    return new Line(p, this.joiner.$oriented ? p2 : p1);
  }
};
function closestGridPoints(e, p) {
  const gridPoints = e.$gridPoints().map((q) => [q, q.$dist(p)]);
  gridPoints.sort((a, b) => a[1] - b[1]);
  return gridPoints.map((t) => t[0]);
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/joiner/joiner.ts
var Joiner = class {
  constructor(overlaps, repo) {
    const junctions = [];
    const [o1, o2] = overlaps;
    if (o1.ox == o2.ox || o1.oy == o2.oy) return;
    [this.g1, this.g2] = overlaps.map((o) => {
      const j = repo.$junctions[o.parent];
      junctions.push(j);
      return Array.from(generate(o.ox, o.oy, j.sx));
    });
    const [j1, j2] = junctions;
    this.$oriented = j1.c[0].e == j2.c[0].e;
    this.$isClockwise = o1.ox > o2.ox;
    this.q = this.$oriented ? 0 : 2;
    [this.q1, this.q2] = this._getQuadrantCombination();
    this.$intersectionDist = repo.$getMaxIntersectionDistance(j1, j2, this.$oriented);
    this.w1 = j1.sx;
    this.w2 = j2.sx;
    [this.s1, this.s2] = this.$oriented ? [o1.shift, o2.shift] : [getReverseShift(o1, j1), getReverseShift(o2, j2)];
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Public methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  *$simpleJoin(strategy) {
    const { s1, s2 } = this;
    yield* this.join(SimpleJoinLogic, (P1, P2) => {
      const parallel = P1.$direction.value.$parallel(P2.$direction.value);
      if (strategy == "PERFECT" /* perfect */ && !parallel) return false;
      if ((s1 || s2) && parallel) return false;
      return true;
    });
  }
  *$baseJoin() {
    yield* this.join(BaseJoinLogic);
  }
  *$standardJoin() {
    const { s1, s2 } = this, shift2 = Boolean(s1) || Boolean(s2);
    let counter = 0;
    yield* this.join(
      StandardJoinLogic,
      (P1, P2) => shift2 || counter++ == 0
      // Return only the first one
    );
  }
  $getRelayJoinIntersection(piece, shift2, q) {
    const testVector = this.$oriented ? QV[0 /* UR */] : QV[2 /* LL */];
    const pt = piece.$anchors.value[this.q].$sub(new Vector(shift2));
    return piece.$shape.value.ridges[q].$intersection(pt, testVector);
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  *join(Logic, precondition) {
    const { g1, g2 } = this;
    const result = [];
    if (!g1) return;
    for (const p1 of g1) {
      for (const p2 of g2) {
        const P1 = new Piece(p1);
        const P2 = new Piece(p2);
        if (precondition && !precondition(P1, P2)) continue;
        result.push(...new Logic(this, P1, P2).$join());
      }
    }
    result.sort((a, b) => a[1] - b[1]);
    for (const [j] of result) yield j;
  }
  _getQuadrantCombination() {
    if (this.$oriented) {
      return this.$isClockwise ? [2 /* LL */, 1 /* UL */] : [1 /* UL */, 2 /* LL */];
    } else {
      return this.$isClockwise ? [0 /* UR */, 3 /* LR */] : [3 /* LR */, 0 /* UR */];
    }
  }
};
function getReverseShift(o, j) {
  const x = o.ox + (o.shift?.x ?? 0), y = o.oy + (o.shift?.y ?? 0);
  if (x == j.ox && y == j.oy) return void 0;
  return { x: x - j.ox, y: y - j.oy };
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/repository.ts
var Repository = class {
  constructor(stretch, junctions, signature, prototype) {
    this._joinerCache = /* @__PURE__ */ new Map();
    /** The current index of {@link Configuration}. */
    this._index = 0;
    this.$stretch = stretch;
    this.$signature = signature;
    this.$f = junctions[0].$f;
    this.$origin = new Point(junctions[0].$tip);
    const { map, directional, oppositeMap } = createQuadrants(junctions);
    this.$quadrants = map;
    this.$directionalQuadrants = directional;
    this.$oppositeMap = oppositeMap;
    this.$nodeSet = new NodeSet(junctions, map);
    State.$newRepositories.add(this);
    State.$repoToProcess.add(this);
    this.$junctions = junctions.map((j) => j.$toOrientedJSON(this.$f));
    this.$isValid = Boolean(prototype?.pattern) || this._checkValidity();
    this._configurations = new Store(configGenerator(this, prototype));
    if (prototype?.repo) {
      this._configurations.$rest();
      this._index = prototype.repo.index;
    }
  }
  toJSON() {
    if (!this._configurations.$done) return void 0;
    return {
      configurations: this.$configurations.map((config) => config.toJSON(true)),
      index: this._index
    };
  }
  set $index(v) {
    this._index = v;
    this.$configuration?.$tryUpdateOrigin();
  }
  get $direction() {
    return this.$f.x == this.$f.y ? 0 /* FW */ : 1 /* BW */;
  }
  get $configuration() {
    const configurations = this._configurations.$entries;
    if (configurations.length === 0) return null;
    return configurations[this._index];
  }
  get $configurations() {
    return this._configurations.$entries;
  }
  get $pattern() {
    return this.$configuration?.$pattern ?? null;
  }
  /** Stop when the first {@link Pattern} is found. */
  $init() {
    this._configurations.$next();
  }
  /** Find all {@link Pattern}s when there's free time. */
  $complete() {
    this._configurations.$rest();
    for (const config of this._configurations.$entries) {
      config.$complete();
    }
  }
  /** Try to update {@link $origin}, and return if changes has been made. */
  $tryUpdateOrigin(origin) {
    if (this.$origin.eq(origin)) return false;
    this.$origin = new Point(origin);
    this.$configurations.forEach((c) => c.$originDirty = true);
    this.$configuration?.$tryUpdateOrigin();
    return true;
  }
  /**
   * In a 3-flap layout, calculate the maximal allowing distance from the intersection anchor to the shared corner.
   * @param oriented Sharing lower-left corner
   */
  $getMaxIntersectionDistance(r1, r2, oriented) {
    const q = oriented ? 2 : 0;
    const n1 = r1.c[q].e;
    const n2 = r2.c[q].e;
    const n3 = r1.c[2 - q].e;
    return this.$nodeSet.$distTriple(n1, n2, n3).d3;
  }
  /** Create (or reuse) a {@link Joiner} by the {@link JOverlap}s. */
  $getJoiner(overlaps) {
    const key = JSON.stringify(overlaps);
    let j = this._joinerCache.get(key);
    if (!j) this._joinerCache.set(key, j = new Joiner(overlaps, this));
    return j;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Perform some basic checks to see if it's remotely possible
   * for this {@link Repository} to have a working pattern.
   */
  _checkValidity() {
    if (this.$junctions.length == 1) return true;
    for (const quadrants2 of this.$directionalQuadrants) {
      for (const quadrant of quadrants2) {
        if (!quadrant.$checkValidity(this.$nodeSet)) return false;
      }
    }
    return true;
  }
};
function createQuadrants(junctions) {
  const oppositeMap = {};
  const quadrantCodes = /* @__PURE__ */ new Map();
  for (const j of junctions) {
    const a = j.$a.id, b = j.$b.id;
    (oppositeMap[a] ||= []).push(b);
    (oppositeMap[b] ||= []).push(a);
    getOrSetEmptyArray(quadrantCodes, j.$q1).push(j);
    getOrSetEmptyArray(quadrantCodes, j.$q2).push(j);
  }
  const directional = makePerQuadrant((_) => []);
  const map = /* @__PURE__ */ new Map();
  for (const [code, relevantJunctions] of quadrantCodes) {
    const quadrant = new Quadrant(code, relevantJunctions);
    map.set(code, quadrant);
    directional[quadrant.q].push(quadrant);
  }
  for (let q = 0; q < quadrantNumber; q++) {
    directional[q].sort(minQuadrantWeightComparator);
  }
  return { map, directional, oppositeMap };
}

// ../bp-studio/box-pleating-studio/src/core/design/layout/stretch.ts
var Stretch = class {
  constructor(junctions, prototype) {
    /**
     * Whether self is currently active.
     * A {@link Stretch} could temporarily become inactive during dragging.
     */
    this.$isActive = true;
    /** {@link Repository} cache during dragging. */
    this._repoCache = /* @__PURE__ */ new Map();
    const signature = getStructureSignature(junctions);
    this.$id = prototype.id;
    this._repo = new Repository(this, junctions, signature, prototype);
  }
  toJSON() {
    const configuration = this._repo.$configuration;
    return {
      id: this.$id,
      configuration: configuration?.toJSON(),
      pattern: configuration?.$pattern?.toJSON(),
      repo: this._repo.toJSON()
    };
  }
  get $repo() {
    return this._repo;
  }
  /**
   * Update the combinations of {@link ValidJunction}s, and create
   * or reuse {@link Repository} as needed.
   */
  $update(junctions, prototype) {
    const signature = getStructureSignature(junctions);
    const origin = junctions[0].$tip;
    const repo = this._repo;
    if (signature === repo.$signature) {
      const oldSet = repo.$nodeSet;
      repo.$nodeSet = new NodeSet(junctions, repo.$quadrants);
      const updated = repo.$tryUpdateOrigin(origin);
      if (!this.$isActive || updated) {
        State.$repoToProcess.add(repo);
        this.$isActive = true;
      } else if (oldSet.$compare(repo.$nodeSet)) {
        State.$repoWithNodeSetChanged.add(repo);
      }
      return;
    }
    clearPatternContourForRepo(repo);
    this.$isActive = true;
    if (State.m.$isDragging) {
      this._repoCache.set(repo.$signature, repo);
      const newRepo = this._repoCache.get(signature);
      if (newRepo) {
        this._repo = newRepo;
        this._repo.$tryUpdateOrigin(origin);
        State.$repoToProcess.add(newRepo);
        return;
      }
    }
    this._repo = new Repository(this, junctions, signature, prototype);
  }
  /** Clear {@link Repository} cache. */
  $cleanup() {
    this._repoCache.clear();
  }
  /**
   * Finish searching for patterns, called when the {@link Stretch} is first selected.
   *
   * Before that happens, a {@link Stretch} will always only yield the first pattern it finds,
   * to save the computation time.
   */
  $complete() {
    this._repo.$complete();
    return this.toJSON();
  }
};

// ../bp-studio/box-pleating-studio/src/core/design/tasks/stretch.ts
var stretchTask = new Task(stretches, patternTask);
function stretches() {
  const validJunctions = getValidJunctions();
  const teams = grouping(validJunctions);
  for (const team of teams) processTeam(team.$junctions);
  for (const id of State.$stretchDiff.$diff()) {
    const s = State.$stretches.get(id);
    clearPatternContourForRepo(s.$repo);
    if (State.m.$isDragging) {
      s.$isActive = false;
      State.$stretchCache.set(id, s);
    }
    State.$stretches.delete(id);
    UpdateResult.$removeStretch(id);
  }
}
function grouping(junctions) {
  const unionFind = new ListUnionFind(
    // Involved Junctions are at most Quadrant times 2
    junctions.length * 2
  );
  const quadrantMap = new IntDoubleMap();
  for (const j of junctions) {
    quadrantMap.set(j.$a.id, j.$b.id, j);
    unionFind.$union(j.$q1, j.$q2);
  }
  const groups = unionFind.$list();
  const result = [];
  for (const group of groups) {
    const $junctions = [];
    const $flaps = distinct(group.map((q) => q >>> 2).sort(minComparator));
    foreachPair($flaps, (i, j) => {
      const junction2 = quadrantMap.get(i, j);
      if (junction2 && group.includes(junction2.$q1)) $junctions.push(junction2);
    });
    result.push({ $junctions, $flaps });
  }
  return result;
}
function processTeam(junctions) {
  const uncoveredJunctions = getUncoveredJunctions(junctions);
  if (uncoveredJunctions.length === 1) {
    const { $a, $b } = uncoveredJunctions[0];
    createOrUpdateStretch({
      $flaps: [$a.id, $b.id],
      $junctions: uncoveredJunctions
    });
  } else {
    const teams = grouping(uncoveredJunctions);
    for (const team of teams) createOrUpdateStretch(team);
  }
}
function getUncoveredJunctions(junctions) {
  if (junctions.length === 1) return junctions;
  foreachPair(junctions, (j1, j2) => checkGeometricalCovering(j1, j2));
  return junctions.filter((j) => !j.$isCovered);
}
function createOrUpdateStretch(team) {
  const stretchId = team.$flaps.join(",");
  State.$stretchDiff.$add(stretchId);
  const oldStretch = tryGetStretch(stretchId);
  const prototype = State.$stretchPrototypes.get(stretchId) || { id: stretchId };
  if (oldStretch) {
    oldStretch.$update(team.$junctions, prototype);
  } else {
    const stretch = new Stretch(team.$junctions, prototype);
    State.$stretches.set(stretchId, stretch);
  }
}
function tryGetStretch(id) {
  let result = State.$stretches.get(id);
  if (!result && State.m.$isDragging) {
    result = State.$stretchCache.get(id);
    if (result) State.$stretches.set(id, result);
  }
  return result;
}
function getValidJunctions() {
  const result = [];
  for (const j of State.$junctions.values()) {
    if (j.$valid) {
      j.$resetCovering();
      result.push(j);
    }
  }
  return result;
}
function checkGeometricalCovering(j1, j2) {
  if (j2.$lca.$dist > j1.$lca.$dist) [j1, j2] = [j2, j1];
  const n = getPathIntersectionDistances(j1, j2);
  if (!n) return;
  const r1 = j1.$getBaseRectangle(n[0]);
  const r2 = j2.$getBaseRectangle(n[1]);
  const j1Closer = j1.$isCloserThan(j2);
  if (r1.eq(r2)) {
    const [a1, b1] = j1.$orientedIds;
    const [a2, b2] = j2.$orientedIds;
    if (a1 !== a2 && b1 !== b2) return;
    if (j1Closer) j2.$setGeometricallyCoveredBy(j1);
    else j1.$setGeometricallyCoveredBy(j2);
  } else if (j1Closer && r1.$contains(r2)) {
    j2.$setGeometricallyCoveredBy(j1);
  } else if (j2.$isCloserThan(j1) && r2.$contains(r1)) {
    j1.$setGeometricallyCoveredBy(j2);
  }
}
function getPathIntersectionDistances(j1, j2) {
  const p1 = j1.$lca, p2 = j2.$lca;
  if (p1 === p2) return [j1.$a.$dist - p1.$dist, j2.$a.$dist - p1.$dist];
  if (p1.$dist === p2.$dist) return void 0;
  if (isAncestor(p1, j2.$a)) return [j1.$a.$dist - p1.$dist, j2.$a.$dist - p1.$dist];
  if (isAncestor(p1, j2.$b)) return [j1.$a.$dist - p1.$dist, dist(j2.$a, p1, p2)];
  return void 0;
}
function isAncestor(p, n) {
  while (n.$dist > p.$dist) n = n.$parent;
  return n === p;
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/junction.ts
var junctionTask = new Task(junction, invalidJunctionTask, stretchTask);
function junction() {
  UpdateResult.$pruneJunctions(State.$junctions);
  for (const node of State.$childrenChanged) {
    if (node.$children.$size > 0) State.$junctions.delete(node.id);
  }
  getCollisionOfLCA(State.m.$tree.$root);
}
function getCollisionOfLCA(lca) {
  const children = [...lca.$children];
  const l = children.length;
  for (let i = 0; i < l; i++) {
    const a = children[i];
    const distChanged = ancestorChanged(a);
    for (let j = i + 1; j < l; j++) {
      const b = children[j];
      compare(a, b, lca, distChanged || ancestorChanged(b));
    }
    if (State.$subtreeAABBChanged.has(a)) {
      getCollisionOfLCA(getNontrivialDescendant(a));
    }
  }
}
function compare(A, B, lca, distChanged) {
  if (!distChanged && !State.$subtreeAABBChanged.has(A) && !State.$subtreeAABBChanged.has(B)) return;
  if (!intersects(A, B, lca)) {
    clearJunctions(A, B);
    return;
  }
  const ctx = { distChanged };
  const a = getNontrivialDescendant(A, ctx);
  const b = getNontrivialDescendant(B, ctx);
  distChanged = ctx.distChanged;
  const n = a.$children.$size;
  const m = b.$children.$size;
  if (n === 0 && m === 0) {
    State.$junctions.set(a.id, b.id, createJunction(a, b, lca));
  } else {
    if (m === 0 || n !== 0 && n < m) {
      for (const c of a.$children) compare(c, b, lca, distChanged || ancestorChanged(c));
    } else {
      for (const c of b.$children) compare(a, c, lca, distChanged || ancestorChanged(c));
    }
  }
}
function intersects(a, b, lca) {
  return a.$AABB.$intersects(b.$AABB, dist(a, b, lca));
}
function getNontrivialDescendant(node, ctx) {
  while (node.$children.$size === 1) {
    node = node.$children.$get();
    if (ctx) ctx.distChanged ||= ancestorChanged(node);
  }
  return node;
}
function clearJunctions(a, b) {
  for (const aLeaf of a.$leaves) {
    for (const bLeaf of b.$leaves) {
      State.$junctions.delete(aLeaf.id, bLeaf.id);
    }
  }
}
function ancestorChanged(n) {
  return State.$lengthChanged.has(n) || State.$parentChanged.has(n);
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/aabb.ts
var AABBTask = new Task(aabb, junctionTask, roughContourTask);
function aabb() {
  climb(updater3, State.$lengthChanged, State.$nodeAABBChanged, State.$parentChanged);
}
function updater3(node) {
  if (!node.$parent) return false;
  State.$subtreeAABBChanged.add(node);
  if (node.$isLeaf) State.$flapChanged.add(node);
  let result;
  if (State.$parentChanged.has(node)) {
    node.$AABB.$setMargin(node.$length);
    result = node.$parent.$AABB.$addChild(node.$AABB);
  } else {
    result = node.$parent.$AABB.$updateChild(node.$AABB);
  }
  if (!result) {
    while (node.$parent) {
      State.$subtreeAABBChanged.add(node.$parent);
      node = node.$parent;
    }
  }
  return result;
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/structure.ts
var structureTask = new Task(structure, AABBTask);
function structure() {
  if (State.m.$rootChanged) {
    updateDistRecursive(State.m.$tree.$root, 0);
  } else {
    const heap = new HeapSet(maxDistComparator);
    for (const node of State.$lengthChanged) heap.$insert(node);
    while (!heap.$isEmpty) {
      const node = heap.$pop();
      node.$dist = node.$parent.$dist + node.$length;
      for (const child of node.$children) heap.$insert(child);
    }
  }
  climb(leafList, State.$childrenChanged);
}
function updateDistRecursive(node, v) {
  node.$dist = v;
  for (const child of node.$children) {
    updateDistRecursive(child, v + child.$length);
  }
}
function leafList(node) {
  node.$updateLeaves();
  return true;
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/balance.ts
var balanceTask = new Task(balance, structureTask);
function balance() {
  const tree = State.m.$tree;
  const oldRoot = tree.$root;
  let newRoot = tryBalance(oldRoot);
  while (newRoot) {
    tree.$root = newRoot;
    newRoot = tryBalance(tree.$root);
  }
  if (tree.$root != oldRoot) State.m.$rootChanged = true;
  balanceTask.data = void 0;
}
function tryBalance(root) {
  const first = root.$children.$get();
  if (!first) return null;
  const second = root.$children.$getSecond();
  const secondHeight = second ? second.$height + 1 : 0;
  if (first.$height <= secondHeight && first.id !== balanceTask.data) return null;
  root.$height = secondHeight;
  first.$cut();
  root.$length = first.$length;
  root.$pasteTo(first);
  first.$length = 0;
  return first;
}

// ../bp-studio/box-pleating-studio/src/core/design/tasks/height.ts
var heightTask = new Task(height, balanceTask);
function height() {
  climb(updater4, State.$childrenChanged);
}
function updater4(node) {
  const n = node;
  const newHeight = 1 + (n.$children.$get()?.$height ?? -1);
  if (newHeight === n.$height) return false;
  n.$height = newHeight;
  n.$parent?.$children.$notifyUpdate(n);
  return true;
}

// ../bp-studio/box-pleating-studio/src/core/service/processor.ts
var Processor;
((Processor2) => {
  const taskHeap = new HeapSet((a, b) => b.$priority - a.$priority);
  function $run(...tasks) {
    queue(tasks);
    while (!taskHeap.$isEmpty) {
      const task = taskHeap.$pop();
      task.$action();
      queue(task.$dependant);
    }
    State.$reset();
  }
  Processor2.$run = $run;
  function queue(tasks) {
    for (const task of tasks) taskHeap.$insert(task);
  }
})(Processor || (Processor = {}));

// ../bp-studio/box-pleating-studio/src/core/math/sweepLine/clip/clip.ts
var Clip = class extends DivideAndCollect {
  constructor() {
    super(new GeneralEventProvider(true), new GeneralIntersector());
    this._orientation = compareOrientation;
    this._endProcessor = generalEndProcessor;
    this._shouldPickInside = true;
  }
  /** Process the set of crease pattern lines. */
  $get(creases) {
    this._reset();
    for (const c of creases) {
      const { p1, p2 } = c;
      const segment = new LineSegment(p1, p2, 0, c.type);
      if (c.type == 1 /* Border */) {
        const entering = xyComparator(p1, p2) < 0;
        if (entering) this._addSegment(segment, 1);
        else this._addSegment(segment, -1);
      } else {
        this._addSegment(segment, 0);
      }
    }
    this._sweep();
    return this._collectedSegments.map((s) => ({
      type: s.$type,
      p1: s.$start,
      p2: s.$end
    }));
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  // Protected methods
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  _setInsideFlag(event, prev) {
    if (prev) event.$wrapCount += prev.$wrapCount;
    event.$isInside = event.$segment.$type == 1 /* Border */ || // borders always count
    !sameLine(event, prev) && // ignore identical lines
    event.$wrapCount != 0;
  }
};
function sameLine(ev1, ev2) {
  if (!ev2) return false;
  return epsilonSame(ev1.$point, ev2.$point) && epsilonSame(ev1.$other.$point, ev2.$other.$point);
}

// ../bp-studio/box-pleating-studio/src/core/controller/layoutController.ts
var LayoutController;
((LayoutController2) => {
  function dragEnd() {
    State.m.$isDragging = false;
    State.$stretchCache.clear();
    for (const stretch of State.$stretches.values()) stretch.$cleanup();
    return true;
  }
  LayoutController2.dragEnd = dragEnd;
  function getCP(borders, useAuxiliary = true) {
    const clip = new Clip();
    const tree = State.m.$tree;
    const lines = [];
    addPolygon(lines, [borders], 1 /* Border */);
    for (const node of tree.$nodes) {
      if (!node || !node.$parent) continue;
      const hingeType = useAuxiliary ? 4 /* Auxiliary */ : 3 /* Valley */;
      addPolygon(lines, node.$graphics.$contours.map((c) => c.outer), hingeType);
      addLines(lines, node.$graphics.$ridges, 2 /* Mountain */);
    }
    for (const stretch of State.$stretches.values()) {
      const pattern2 = stretch.$repo.$pattern;
      if (!pattern2) continue;
      for (const device of pattern2.$devices) {
        addLines(lines, device.$drawRidges, 2 /* Mountain */);
        addLines(lines, device.$axisParallels, 3 /* Valley */);
      }
    }
    return clip.$get(lines);
  }
  LayoutController2.getCP = getCP;
  function switchConfig(stretchId, to) {
    const stretch = State.$stretches.get(stretchId);
    const repo = stretch.$repo;
    repo.$index = to;
    State.$repoToProcess.add(repo);
    Processor.$run(patternTask);
  }
  LayoutController2.switchConfig = switchConfig;
  function switchPattern(stretchId, to) {
    const stretch = State.$stretches.get(stretchId);
    const repo = stretch.$repo;
    repo.$configuration.$index = to;
    State.$repoToProcess.add(repo);
    Processor.$run(patternTask);
  }
  LayoutController2.switchPattern = switchPattern;
  function completeStretch(stretchId) {
    const stretch = State.$stretches.get(stretchId);
    if (!stretch) return null;
    return stretch.$complete();
  }
  LayoutController2.completeStretch = completeStretch;
  function moveDevice(stretchId, index, location) {
    const stretch = State.$stretches.get(stretchId);
    const repo = stretch.$repo;
    const device = repo.$pattern.$devices[index];
    device.$location = location;
    State.$movedDevices.add(device);
    State.$repoToProcess.add(repo);
    Processor.$run(patternTask);
  }
  LayoutController2.moveDevice = moveDevice;
  function addPolygon(set, polygon, type) {
    for (const path of polygon) {
      const l = path.length;
      for (let i = 0; i < l; i++) {
        const p1 = path[i], p2 = path[i + 1] || path[0];
        set.push({ type, p1, p2 });
      }
    }
  }
  function addLines(set, lines, type) {
    for (const line of lines) {
      const [p1, p2] = line;
      set.push({ type, p1, p2 });
    }
  }
})(LayoutController || (LayoutController = {}));

// ../bp-studio/box-pleating-studio/src/origami-compiler/entry.ts
function blueprint(input) {
  fullReset();
  const tree = new Tree(input.edges, input.flaps);
  State.m.$tree = tree;
  Processor.$run(heightTask);
  const { width: w, height: h } = input;
  const lines = LayoutController.getCP([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], false);
  const junctions = [...State.$junctions.values()];
  const stretches2 = [...State.$stretches.values()];
  return {
    lines: lines.map((l) => ({ type: l.type, p1: { x: l.p1.x, y: l.p1.y }, p2: { x: l.p2.x, y: l.p2.y } })),
    junctions: junctions.length,
    invalidJunctions: junctions.filter((j) => !j.$valid).length,
    stretches: stretches2.length,
    stretchesWithPattern: stretches2.filter((s) => s.$repo.$pattern).length
  };
}
export {
  blueprint
};
