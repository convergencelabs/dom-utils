import {RealTimeArray, RealTimeObject, RealTimeString, RealTimeModel} from "@convergence/convergence";
import {DomConverter} from "./DomConverter";
import StringChangeDetector from "@convergence/string-change-detector";

import {MutationSummary} from "mutation-summary";
import {SelectionUtils} from "./SelectionUtils";

const CHILD_NODES: string = "childNodes";
const NODE_VALUE: string = "nodeValue";
const ATTRIBUTES: string = "attributes";
const NODE_TYPE: string = "nodeType";

/**
 * Binds a convergence RealTimeObject to a DOM Node. The content of the element
 * will be replaced by the DOM represented by the RealTimeObject.
 */
export class DomBinder {
  private _observer: MutationSummary;
  private readonly _object: RealTimeObject;
  private readonly _element: HTMLElement;
  private _bound: boolean;

  constructor(element: HTMLElement, object: RealTimeObject | RealTimeModel, autoBind: boolean = true) {
    if (!element) {
      throw new Error("The 'element' parameter must be an instance of HTMLElement.");
    }

    if (object instanceof RealTimeModel) {
      object = object.root();
    } else if (!(object instanceof RealTimeObject)) {
      // we don't need to check this if we just got the object from a model.
      throw new Error("The 'object' parameter must be an instance of RealTimeObject.");
    } else if (object.isDetached()) {
      // we don't need to check this either if we just got the object from a model.
      throw new Error("Can not bind to a detached RealTimeObject.")
    }

    if (!object.hasKey(CHILD_NODES)) {
      throw new Error(`The root RealTimeObject is missing the ${CHILD_NODES} property.`);
    }

    this._object = object;
    this._element = element;

    if (autoBind) {
      this.bind();
    }
  }

  public bind(): void {
    if (this._bound) {
      throw new Error("Can not call bind() when the DomBinder is already bound.");
    }

    // Clear the node
    while (this._element.firstChild) {
      this._element.removeChild(this._element.firstChild);
    }

    const value: any[] = this._object.elementAt(CHILD_NODES).value();
    value.forEach(child => {
      this._element.appendChild(DomConverter.jsonToNode(child));
    });

    this._bind(this._element, this._object);

    this._observer = new MutationSummary({
      rootNode: this._element,
      callback: this._handleChange.bind(this),
      queries: [{all: true}]
    });

    this._bound = true;
  }

  public isBound(): boolean {
    return this._bound;
  }

  public unbind(): void {
    if (!this._bound) {
      throw new Error("Can not call unbind() when the DomBinder is not bound.");
    }

    this._observer.disconnect();
    this._unbind(this._object);
    this._bound = false;
  }

  private _handleChange(changes) {
    changes.forEach(summary => {
      this._object.model().startBatch();

      summary.characterDataChanged.forEach(textNode => {
        textNode.__scd.processNewValue(textNode.nodeValue);
      });

      const removeNodes = summary.removed.slice(0);
      summary.reparented.forEach(node => removeNodes.push(node)); // fixme when we handle move.
      // fixme sort by depth

      removeNodes.forEach(removed => {
        const rte = removed.__convergence_model;
        if (!rte.isDetached()) {
          const path = rte.path();
          const index = path[path.length - 1];
          // TODO simplify this when we add the pacd ..rent() method.
          const parentPath = rte.path();
          parentPath.pop();
          const parent = rte.model().elementAt(parentPath);
          parent.remove(index);
        }
      });

      const insertedByExistingParent = {};
      const addedNodes = summary.added.slice();
      summary.reparented.forEach(node => addedNodes.push(node));
      // fixme sort by depth

      addedNodes.forEach(added => {
        const parentNode = added.parentNode;
        const parentModel = parentNode.__convergence_model;
        // TODO I am not sure why we need to check for detached.
        if (parentModel && !parentModel.isDetached()) {
          const id = parentModel.id();
          if (!insertedByExistingParent[id]) {
            insertedByExistingParent[id] = [];
          }

          insertedByExistingParent[id].push({
            node: added,
            index: DomBinder._findIndexInParent(added),
            parentModel: parentModel
          });
        }
      });

      Object.keys(insertedByExistingParent).forEach(id => {
        const added = insertedByExistingParent[id];
        added.sort((x1, x2) => x1.index - x2.index);
        added.forEach(add => {
          const childNodes = add.parentModel.get(CHILD_NODES);
          const newJson = DomConverter.nodeToJson(add.node);
          const rte = childNodes.insert(add.index, newJson);
          this._bind(add.node, rte);
        });
      });

      Object.keys(summary.attributeChanged).forEach(attrName => {
        const changedNodes = summary.attributeChanged[attrName];
        changedNodes.forEach(node => {
          if (node !== this._element) {
            const model: RealTimeObject = node.__convergence_model;
            const newVal = node.getAttribute(attrName);
            const attributes = model.get("attributes") as RealTimeObject;

            if (newVal !== null && newVal != undefined) {
              attributes.set(attrName, newVal);
            } else {
              attributes.remove(attrName);
            }
          }
        });
      })
    });

    if (this._object.model().batchSize() > 0) {
      this._object.model().completeBatch();
    } else {
      this._object.model().cancelBatch();
    }
  }

  private _bind = (domNode, realTimeElement) => {
    domNode.__convergence_model = realTimeElement;
    switch (domNode.nodeType) {
      case 1:
        this._bindElement(domNode, realTimeElement);
        break;
      case 3:
        this._bindTextNode(domNode, realTimeElement);
        break;
    }
  };

  private _bindElement(element, realTimeElement) {
    const attributes = realTimeElement.get(ATTRIBUTES);
    const childNodes = realTimeElement.get(CHILD_NODES);

    childNodes.on(RealTimeArray.Events.INSERT, e => {
      const beforeNode = element.childNodes.item(e.index);
      const newChild = DomConverter.jsonToNode(e.value.value());

      const originalSelection = SelectionUtils.getSelection(this._element);

      this._observer.disconnect();
      element.insertBefore(newChild, beforeNode);
      this._bind(newChild, e.value);
      this._observer.reconnect();

      if (originalSelection) {
        const insertedRange = SelectionUtils.getRelativeNodeRange(newChild, this._element);
        const transformed = SelectionUtils.transformSelectionOnInsert(originalSelection, insertedRange);
        SelectionUtils.setSelection(transformed, this._element);
      }
    });

    childNodes.on(RealTimeArray.Events.REMOVE, e => {
      const originalSelection = SelectionUtils.getSelection(this._element);
      const removed = element.childNodes.item(e.index);
      const removedRange = SelectionUtils.getRelativeNodeRange(removed, this._element);

      this._observer.disconnect();
      element.removeChild(removed);
      this._observer.reconnect();

      if (originalSelection) {
        const transformed = SelectionUtils.transformSelectionOnRemove(originalSelection, removedRange);
        SelectionUtils.setSelection(transformed, this._element);
      }
    });

    attributes.on(RealTimeObject.Events.SET, e => {
      this._observer.disconnect();
      element.setAttribute(e.key, e.value.value());
      this._observer.reconnect();
    });

    attributes.on(RealTimeObject.Events.REMOVE, e => {
      this._observer.disconnect();
      element.removeAttribute(e.key);
      this._observer.reconnect();
    });

    element.childNodes.forEach((childNode, index) => {
      const realTimeChild = childNodes.get(index);
      this._bind(childNode, realTimeChild);
    });
  }

  private static _findIndexInParent(child) {
    return Array.prototype.indexOf.call(child.parentNode.childNodes, child);
  }

  private _bindTextNode(textNode, realTimeElement) {
    const nodeValue = realTimeElement.get(NODE_VALUE);

    const scd = new StringChangeDetector({
      value: nodeValue.value(),
      onInsert: (index, value) => {
        nodeValue.insert(index, value)
      },
      onRemove: (index, length) => {
        nodeValue.remove(index, length)
      }
    });

    textNode.__scd = scd;

    const onRemoteInsert = event => {
      if (!event.local) {
        const originalSelection = SelectionUtils.getSelection(this._element);
        scd.insertText(event.index, event.value);

        this._observer.disconnect();
        textNode.nodeValue = scd.getValue();
        this._observer.reconnect();

        if (originalSelection) {
          const nodeRange = SelectionUtils.getRelativeNodeRange(textNode, this._element);
          const offset = nodeRange.start;
          const insertedRange = {start: offset+ event.index, end: offset + event.index + event.value.length};
          const transformed = SelectionUtils.transformSelectionOnInsert(originalSelection, insertedRange);
          SelectionUtils.setSelection(transformed, this._element);
        }
      }
    };
    nodeValue.on(RealTimeString.Events.INSERT, onRemoteInsert);

    const onRemoteRemove = event => {
      if (!event.local) {
        const originalSelection = SelectionUtils.getSelection(this._element);
        scd.removeText(event.index, event.value.length);
        this._observer.disconnect();
        textNode.nodeValue = scd.getValue();
        this._observer.reconnect();

        if (originalSelection) {
          const nodeRange = SelectionUtils.getRelativeNodeRange(textNode, this._element);
          const offset = nodeRange.start;
          const removedRange = {start: offset + event.index, end: offset + event.index + event.value.length};
          const transformed = SelectionUtils.transformSelectionOnRemove(originalSelection, removedRange);
          SelectionUtils.setSelection(transformed, this._element);
        }
      }
    };
    nodeValue.on(RealTimeString.Events.REMOVE, onRemoteRemove);
  }

  private _unbind(realTimeElement) {
    const nodeType = realTimeElement.get(NODE_TYPE).value();
    switch (nodeType) {
      case 1:
        this._unbindElement(realTimeElement);
        break;
      case 3:
        this._unbindTextNode(realTimeElement);
        break;
    }
  };

  private _unbindTextNode(realTimeElement) {
    const nodeValue = realTimeElement.get(NODE_VALUE);
    // TODO later we should probably only remove listeners we add. We could put the listener
    //  in some sort of map, by id later on.
    nodeValue.removeAllListenersForAllEvents();
  }

  private _unbindElement(realTimeElement) {
    // TODO later we should probably only remove listeners we add. We could put the listener
    //  in some sort of map, by id later on.
    const attributes = realTimeElement.get(ATTRIBUTES);
    const childNodes = realTimeElement.get(CHILD_NODES);

    childNodes.removeAllListenersForAllEvents();
    attributes.removeAllListenersForAllEvents();

    childNodes.forEach((childNode, index) => {
      this._unbind(childNode);
    });
  }
}
