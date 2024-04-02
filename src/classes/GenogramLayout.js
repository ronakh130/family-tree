import go from 'gojs';

export class GenogramLayout extends go.LayeredDigraphLayout {
  constructor() {
    super();
    this.alignOption = go.LayeredDigraphLayout.AlignAll;
    this.initializeOption = go.LayeredDigraphLayout.InitDepthFirstIn;
    this.spouseSpacing = 30;
    this.isRouting = false;
  }

  makeNetwork(coll) {
    const net = this.createNetwork();
    if (coll instanceof go.Diagram) {
      this.add(net, coll.nodes, true);
      this.add(net, coll.links, true);
    } else if (coll instanceof go.Group) {
      this.add(net, coll.memberParts, false);
    } else if (coll.iterator) {
      this.add(net, coll.iterator, false);
    }
    return net;
  }

  add(net, coll, nonmemberonly) {
    const horiz = this.direction == 0.0 || this.direction == 180.0;
    const multiSpousePeople = new go.Set();

    const it = coll.iterator;
    while (it.next()) {
      const node = it.value;
      if (!(node instanceof go.Node) || !node.data) continue;
      if (!node.isLayoutPositioned || !node.isVisible()) continue;
      if (nonmemberonly && node.containingGroup !== null) continue;

      if (node.isLinkLabel) {
        const link = node.labeledLink;
        if (link.category === 'Marriage') {
          const spouseA = link.fromNode;
          const spouseB = link.toNode;

          const vertex = net.addNode(node);

          if (horiz) {
            vertex.height = spouseA.actualBounds.height + this.spouseSpacing + spouseB.actualBounds.height;
            vertex.width = Math.max(spouseA.actualBounds.width, spouseB.actualBounds.width);
            vertex.focus = new go.Point(vertex.width / 2, spouseA.actualBounds.height + this.spouseSpacing / 2);
          } else {
            vertex.width = spouseA.actualBounds.width + this.spouseSpacing + spouseB.actualBounds.width;
            vertex.height = Math.max(spouseA.actualBounds.height, spouseB.actualBounds.height);
            vertex.focus = new go.Point(spouseA.actualBounds.width + this.spouseSpacing / 2, vertex.height / 2);
          }
        }
      } else {
        let marriages = 0;
        node.linksConnected.each((l) => {
          if (l.category === 'Marriage') marriages++;
        });
        if (marriages === 0) {
          net.addNode(node);
        } else if (marriages > 1) {
          multiSpousePeople.add(node);
        }
      }
    }

    it.reset();
    while (it.next()) {
      const link = it.value;
      if (!(link instanceof go.Link)) continue;
      if (!link.isLayoutPositioned || !link.isVisible()) continue;
      if (nonmemberonly && link.containingGroup !== null) continue;

      if (link.category === '' && link.data) {
        const parent = net.findVertex(link.fromNode);
        const child = net.findVertex(link.toNode);
        if (child !== null) {
          net.linkVertexes(parent, child, link);
        } else {
          link.toNode.linksConnected.each((l) => {
            if (l.category !== 'Marriage' || !l.data) return;

            const mlab = l.labelNodes.first();

            const mlabvert = net.findVertex(mlab);
            if (mlabvert !== null) {
              net.linkVertexes(parent, mlabvert, link);
            }
          });
        }
      }
    }

    while (multiSpousePeople.count > 0) {
      const node = multiSpousePeople.first();
      const cohort = new go.Set();
      this.extendCohort(cohort, node);

      const dummyvert = net.createVertex();
      net.addVertex(dummyvert);
      const marriages = new go.Set();
      cohort.each((n) => {
        n.linksConnected.each((l) => {
          marriages.add(l);
        });
      });
      marriages.each((link) => {
        const mlab = link.labelNodes.first();
        const v = net.findVertex(mlab);
        if (v !== null) {
          net.linkVertexes(dummyvert, v, null);
        }
      });

      multiSpousePeople.removeAll(cohort);
    }
  }

  extendCohort(coll, node) {
    if (coll.has(node)) return;
    coll.add(node);
    node.linksConnected.each((l) => {
      if (l.category === 'Marriage') {
        this.extendCohort(coll, l.fromNode);
        this.extendCohort(coll, l.toNode);
      }
    });
  }

  assignLayers() {
    super.assignLayers();
    const horiz = this.direction == 0.0 || this.direction == 180.0;

    const maxsizes = [];
    this.network.vertexes.each((v) => {
      const lay = v.layer;
      let max = maxsizes[lay];
      if (max === undefined) max = 0;
      const sz = horiz ? v.width : v.height;
      if (sz > max) maxsizes[lay] = sz;
    });

    this.network.vertexes.each((v) => {
      const lay = v.layer;
      const max = maxsizes[lay];
      if (horiz) {
        v.focus = new go.Point(0, v.height / 2);
        v.width = max;
      } else {
        v.focus = new go.Point(v.width / 2, 0);
        v.height = max;
      }
    });
  }

  initializeIndices() {
    super.initializeIndices();
    const vertical = this.direction === 90 || this.direction === 270;
    this.network.edges.each((e) => {
      if (e.fromVertex.node && e.fromVertex.node.isLinkLabel) {
        e.portFromPos = vertical ? e.fromVertex.focusX : e.fromVertex.focusY;
      }
      if (e.toVertex.node && e.toVertex.node.isLinkLabel) {
        e.portToPos = vertical ? e.toVertex.focusX : e.toVertex.focusY;
      }
    });
  }

  commitNodes() {
    super.commitNodes();

    this.network.vertexes.each((v) => {
      if (v.node !== null && !v.node.isLinkLabel) {
        v.node.position = new go.Point(v.x, v.y);
      }
    });

    const horiz = this.direction == 0.0 || this.direction == 180.0;

    this.network.vertexes.each((v) => {
      if (v.node === null) return;
      if (!v.node.isLinkLabel) return;
      const labnode = v.node;
      const lablink = labnode.labeledLink;

      lablink.invalidateRoute();
      let spouseA = lablink.fromNode;
      let spouseB = lablink.toNode;
      if (spouseA.opacity > 0 && spouseB.opacity > 0) {
        if (spouseA.category === 'F') {
          const temp = spouseA;
          spouseA = spouseB;
          spouseB = temp;
        }

        const aParentsNode = this.findParentsMarriageLabelNode(spouseA);
        const bParentsNode = this.findParentsMarriageLabelNode(spouseB);
        if (
          aParentsNode !== null &&
          bParentsNode !== null &&
          (horiz ? aParentsNode.position.x > bParentsNode.position.x : aParentsNode.position.y > bParentsNode.position.y)
        ) {
          const temp = spouseA;
          spouseA = spouseB;
          spouseB = temp;
        }
        spouseA.moveTo(v.x, v.y);
        if (horiz) {
          spouseB.moveTo(v.x, v.y + spouseA.actualBounds.height + this.spouseSpacing);
        } else {
          spouseB.moveTo(v.x + spouseA.actualBounds.width + this.spouseSpacing, v.y);
        }
      } else if (spouseA.opacity === 0) {
        const pos = horiz ? new go.Point(v.x, v.centerY - spouseB.actualBounds.height / 2) : new go.Point(v.centerX - spouseB.actualBounds.width / 2, v.y);
        spouseB.move(pos);
        if (horiz) pos.y++;
        else pos.x++;
        spouseA.move(pos);
      } else if (spouseB.opacity === 0) {
        const pos = horiz ? new go.Point(v.x, v.centerY - spouseA.actualBounds.height / 2) : new go.Point(v.centerX - spouseA.actualBounds.width / 2, v.y);
        spouseA.move(pos);
        if (horiz) pos.y++;
        else pos.x++;
        spouseB.move(pos);
      }
      lablink.ensureBounds();
    });
  }

  findParentsMarriageLabelNode(node) {
    const it = node.findNodesInto();
    while (it.next()) {
      const n = it.value;
      if (n.isLinkLabel) return n;
    }
    return null;
  }
}
