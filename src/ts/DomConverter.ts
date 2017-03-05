export class DomConverter {

  public static htmlToJson(html: string): any {
    const element: HTMLDivElement = document.createElement("div");
    element.innerHTML = html;
    return DomConverter.nodeToJson(element);
  }

  public static nodeToJson(node: Node): any {
    switch (node.nodeType) {
      case 1:
        return DomConverter._elementToJson(node as HTMLElement);
      case 3:
        return DomConverter._textNodeToJson(node);
    }
  }

  public static jsonToNode(json: any): Node {
    switch (json.nodeType) {
      case 1:
        return DomConverter._jsonToElement(json);
      case 3:
        return DomConverter._jsonToTextNode(json);
    }
  }

  private static _elementToJson(element: HTMLElement): any {
    const json = {
      nodeType: element.nodeType,
      tagName: element.tagName,
      attributes: {},
      childNodes: []
    };

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes.item(i);
      json.attributes[attr.name] = attr.value;
    }

    const children: NodeList = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child: Node = children.item(i);
      json.childNodes.push(DomConverter.nodeToJson(child));
    }

    return json;
  }

  private static _textNodeToJson(node: Node): any {
    return {
      nodeType: node.nodeType,
      nodeValue: node.nodeValue
    };
  }

  private static _jsonToElement(json: any): Element {
    const element = document.createElement(json.tagName);

    Object.keys(json.attributes).forEach(attr => {
      element.setAttribute(attr, json.attributes[attr]);
    });

    json.childNodes.forEach(child => {
      element.appendChild(DomConverter.jsonToNode(child));
    });

    return element;
  }

  private static _jsonToTextNode(json) {
    return document.createTextNode(json.nodeValue);
  }
}
