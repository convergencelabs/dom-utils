export class DomConverter {

  public static htmlToJson(html: string): any {
    const element: HTMLDivElement = document.createElement("div");
    element.innerHTML = html;
    return DomConverter.nodeToJson(element);
  }

  public static nodeToJson(node: Node): any {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        return DomConverter._elementToJson(node as HTMLElement);
      case Node.TEXT_NODE:
        return DomConverter._textNodeToJson(node as Text);
      case Node.COMMENT_NODE:
        return DomConverter._commentToJson(node as Comment);
      case Node.CDATA_SECTION_NODE:
        return DomConverter._cdataToJson(node as CDATASection);
      default:
        throw new Error("unsupported node type: " + node.nodeType)
    }
  }

  public static jsonToNode(json: any): Node {
    switch (json.nodeType) {
      case Node.ELEMENT_NODE:
        return DomConverter._jsonToElement(json);
      case Node.TEXT_NODE:
        return DomConverter._jsonToTextNode(json);
      case Node.COMMENT_NODE:
        return DomConverter._jsonToComment(json);
      case Node.CDATA_SECTION_NODE:
        return DomConverter._jsonToCdata(json);
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

  private static _cdataToJson(node: CDATASection): any {
    return {
      nodeType: node.nodeType,
      nodeValue: node.nodeValue
    };
  }

  private static _commentToJson(node: Comment): any {
    return {
      nodeType: node.nodeType,
      nodeValue: node.nodeValue
    };
  }

  private static _textNodeToJson(node: Text): any {
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

  private static _jsonToTextNode(json): Text {
    return document.createTextNode(json.nodeValue);
  }

  private static _jsonToComment(json): Comment {
    return document.createComment(json.nodeValue);
  }

  private static _jsonToCdata(json): CDATASection {
    return document.createCDATASection(json.nodeValue);
  }
}
