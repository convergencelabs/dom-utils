import {RealTimeArray, RealTimeObject, RealTimeString} from "@convergence/convergence";
import {DomConverter} from "./DomConverter";
import * as MutationSummary from "mutation-summary";

const CHILD_NODES: string = "childNodes";
const NODE_VALUE: string = "nodeValue";
const ATTRIBUTES: string = "attributes";

/**
 * Binds a convergence RealTimeObject to a DOM Node. The content of the element
 * will be replaced by the DOM represented by the RealTimeObject.
 */
export class DomBinder {
  private _observer: MutationSummary;
  private _object: RealTimeObject;

  constructor(element: HTMLElement, object: RealTimeObject) {
    if (!element) {
      throw new Error("The 'element' parameter must be an instance of HTMLElement.");
    }

    if (!(object instanceof RealTimeObject)) {
      throw new Error("The 'object' parameter must be an instance of RealTimeObject.");
    }

    if (object.isDetached()) {
      throw new Error("Can not bind to a detached RealTimeObject.")
    }

    if (!object.hasKey(CHILD_NODES)) {
      throw new Error(`The root RealTimeObject is missing the ${CHILD_NODES} property.`);
    }

    this._object = object;

    // Clear the node
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    const value: any[] = object.elementAt(CHILD_NODES).value();
    value.forEach(child => {
      element.appendChild(DomConverter.jsonToNode(child));
    });

    this._bind(element, object);

    this._observer = new MutationSummary({
      rootNode: element,
      callback: this._handleChange.bind(this),
      queries: [{all: true}]
    });
  }

  public unbind(): void {
    this._observer.disconnect();
    // todo unbind all model callbacks.
  }

  private _handleChange(changes) {
    changes.forEach(summary => {
      this._object.model().startBatch();

      summary.characterDataChanged.forEach(textNode => {
        textNode.__convergence_model.get(NODE_VALUE).value(textNode.nodeValue);
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
    });

    if (this._object.model().batchSize() > 0) {
      this._object.model().endBatch();
    } else {
      this._object.model().cancelBatch();
    }
  }

  private _bind = function (domNode, realTimeElement) {
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
      this._observer.disconnect();
      const beforeNode = element.childNodes.item(e.index);
      const newChild = DomConverter.jsonToNode(e.value.value());
      element.insertBefore(newChild, beforeNode);
      this._bind(newChild, e.value);
      this._observer.reconnect();
    });

    childNodes.on(RealTimeArray.Events.REMOVE, e => {
      this._observer.disconnect();
      const removed = element.childNodes.item(e.index);
      element.removeChild(removed);
      this._observer.reconnect();
    });

    attributes.on(RealTimeObject.Events.SET, e => {
      this._observer.disconnect();
      element.attributes.element.setAttribute(e.key, e.value.value());
      this._observer.reconnect();
    });

    attributes.on(RealTimeObject.Events.REMOVE, e => {
      this._observer.disconnect();
      element.attributes.element.removeAttribute(e.key);
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
    nodeValue.on(RealTimeString.Events.VALUE, e => {
      this._observer.disconnect();
      textNode.nodeValue = e.element.value();
      this._observer.reconnect();
    });
  }
}
