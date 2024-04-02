import * as go from 'gojs';
// @ts-expect-error No package types
import { GenogramLayout } from '../classes/GenogramLayout'
import { familyData } from './familyData';

export function initDiagram() {
  const $ = go.GraphObject.make;
  const myDiagram = new go.Diagram({
    'animationManager.isEnabled': false,
    initialAutoScale: go.Diagram.Uniform,
    maxSelectionCount: 0,
    layout: $(GenogramLayout, { direction: 90, layerSpacing: 30, columnSpacing: 10 }),
  });

  const male = '#90CAF9';
  const female = '#F48FB1';

  myDiagram.add(
    $(
      go.Part,
      'Table',
      { position: new go.Point(0, 100), selectable: false },
      $(go.TextBlock, 'Key', { row: 0, font: '700 14px Droid Serif, sans-serif' }),
      $(
        go.Panel,
        'Horizontal',
        { row: 1, alignment: go.Spot.Left },
        $(go.Shape, 'Square', { desiredSize: new go.Size(30, 30), fill: male, margin: 5 }),
        $(go.TextBlock, 'Males', { font: '700 13px Droid Serif, sans-serif' })
      ),
      $(
        go.Panel,
        'Horizontal',
        { row: 2, alignment: go.Spot.Left },
        $(go.Shape, 'Circle', { desiredSize: new go.Size(30, 30), fill: female, margin: 5 }),
        $(go.TextBlock, 'Females', { font: '700 13px Droid Serif, sans-serif' })
      )
    )
  );

  myDiagram.nodeTemplateMap.add(
    'M',
    $(
      go.Node,
      'Vertical',
      { locationSpot: go.Spot.Center, locationObjectName: 'ICON', selectionObjectName: 'ICON' },
      new go.Binding('opacity', 'hide', (h) => (h ? 0 : 1)),
      new go.Binding('pickable', 'hide', (h) => !h),
      $(go.Panel, { name: 'ICON' }, $(go.Shape, 'Square', { width: 40, height: 40, strokeWidth: 2, fill: male, stroke: '#a1a1a1', portId: '' })),
      $(go.TextBlock, { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' }, new go.Binding('text', 'n'))
    )
  );

  myDiagram.nodeTemplateMap.add(
    'F',
    $(
      go.Node,
      'Vertical',
      { locationSpot: go.Spot.Center, locationObjectName: 'ICON', selectionObjectName: 'ICON' },
      new go.Binding('opacity', 'hide', (h) => (h ? 0 : 1)),
      new go.Binding('pickable', 'hide', (h) => !h),
      $(go.Panel, { name: 'ICON' }, $(go.Shape, 'Circle', { width: 40, height: 40, strokeWidth: 2, fill: female, stroke: '#a1a1a1', portId: '' })),
      $(go.TextBlock, { textAlign: 'center', maxSize: new go.Size(80, NaN), background: 'rgba(255,255,255,0.5)' }, new go.Binding('text', 'n'))
    )
  );

  myDiagram.nodeTemplateMap.add('LinkLabel', $(go.Node, { selectable: false, width: 1, height: 1, fromEndSegmentLength: 20 }));

  myDiagram.linkTemplate = $(
    go.Link,
    { routing: go.Link.Orthogonal, corner: 0, curviness: 15, layerName: 'Background', selectable: true },
    $(go.Shape, { stroke: 'gray', strokeWidth: 2 })
  );

  myDiagram.linkTemplateMap.add(
    'Marriage',
    $(
      go.Link,
      {
        routing: go.Link.AvoidsNodes,
        corner: 10,
        fromSpot: go.Spot.LeftRightSides,
        toSpot: go.Spot.LeftRightSides,
        selectable: false,
        isTreeLink: false,
        layerName: 'Background',
      },
      $(go.Shape, { strokeWidth: 2.5, stroke: 'gray' })
    )
  );
  setupDiagram(myDiagram, familyData, 4);

  function setupDiagram(diagram: go.Diagram, array: go.ObjectData[], focusId: number) {
    diagram.model = new go.GraphLinksModel({
      linkLabelKeysProperty: 'labelKeys',
      nodeCategoryProperty: 's',
      copiesArrays: true,
      nodeDataArray: array,
    });
    setupMarriages(diagram);
    setupParents(diagram);

    const node = diagram.findNodeForKey(focusId);
    if (node !== null) node.isSelected = true;
  }

  function findMarriage(diagram: go.Diagram, a: go.Key, b: go.Key) {
    const nodeA = diagram.findNodeForKey(a);
    const nodeB = diagram.findNodeForKey(b);
    if (nodeA !== null && nodeB !== null) {
      const it = nodeA.findLinksBetween(nodeB);
      while (it.next()) {
        const link = it.value;
        if (link.data !== null && link.data.category === 'Marriage') return link;
      }
    }
    return null;
  }

  function setupMarriages(diagram: go.Diagram) {
    const model = diagram.model;
    const nodeDataArray = model.nodeDataArray;
    for (let i = 0; i < nodeDataArray.length; i++) {
      const data = nodeDataArray[i];
      const key = data.key;
      let uxs = data.ux;
      if (uxs !== undefined) {
        if (typeof uxs === 'number') uxs = [uxs];
        for (let j = 0; j < uxs.length; j++) {
          const wife = uxs[j];
          const wdata = model.findNodeDataForKey(wife);
          if (key === wife || !wdata || wdata.s !== 'F') {
            console.log('cannot create Marriage relationship with self or unknown person ' + wife);
            continue;
          }
          const link = findMarriage(diagram, key, wife);
          if (link === null) {
            const mlab = { s: 'LinkLabel' };
            model.addNodeData(mlab);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mdata = { from: key, to: wife, labelKeys: [(mlab as any).key], category: 'Marriage' };
            (model as go.GraphLinksModel).addLinkData(mdata);
          }
        }
      }
      let virs = data.vir;
      if (virs !== undefined) {
        if (typeof virs === 'number') virs = [virs];
        for (let j = 0; j < virs.length; j++) {
          const husband = virs[j];
          const hdata = model.findNodeDataForKey(husband);
          if (key === husband || !hdata || hdata.s !== 'M') {
            console.log('cannot create Marriage relationship with self or unknown person ' + husband);
            continue;
          }
          const link = findMarriage(diagram, key, husband);
          if (link === null) {
            const mlab = { s: 'LinkLabel' };
            model.addNodeData(mlab);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mdata = { from: key, to: husband, labelKeys: [(mlab as any).key], category: 'Marriage' };
            (model as go.GraphLinksModel).addLinkData(mdata);
          }
        }
      }
    }
  }

  function setupParents(diagram: go.Diagram) {
    const model = diagram.model;
    const nodeDataArray = model.nodeDataArray;
    for (let i = 0; i < nodeDataArray.length; i++) {
      const data = nodeDataArray[i];
      const key = data.key;
      const mother = data.m;
      const father = data.f;
      if (mother !== undefined && father !== undefined) {
        const link = findMarriage(diagram, mother, father);
        if (link === null) {
          console.log('unknown marriage: ' + mother + ' & ' + father);
          continue;
        }
        const mdata = link.data;
        if (mdata.labelKeys === undefined || mdata.labelKeys[0] === undefined) continue;
        const mlabkey = mdata.labelKeys[0];
        const cdata = { from: mlabkey, to: key };
        (model as go.GraphLinksModel).addLinkData(cdata);
      }
    }
  }

  return myDiagram;
}
