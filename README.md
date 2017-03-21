# Convergence DOM Utils
[![Build Status](https://travis-ci.org/convergencelabs/dom-utils.svg?branch=master)](https://travis-ci.org/convergencelabs/dom-utils)

This project contains utilities to that make binding the DOM to a Convergence Model.


# Dependencies
This library depends on the following libraries:

* **@convergence/convergence**: The main Convergence client API.


# Building the Distribution

```
npm install
npm run dist
```

# Usage 
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    .edit { border: 1px solid black; height: 400px; width: 400px; margin-top: 15px; }
  </style>
</head>
<body>
<h3>Content Editable Rich Text Area</h3>
<div class="edit" id="editable">Loading...</div>
<script>
  const editable = document.getElementById("editable"); 
  const DOMAIN_URL = "https://api.convergence.io/realtime/domain/<username>/<domain-id>";
  Convergence.connectAnonymously(DOMAIN_URL).then(function (domain) {
    return domain.models().open("content-editable", "test", function () {
      return ConvergenceDomUtils.DomConverter.htmlToJson(
        "Here is some initial text with a <b>bold</b> section and some <i>italics</i>."
      );
    });
  }).then(function (model) {
    const binder = new ConvergenceDomUtils.DomBinder(editable, model);
    editable.contentEditable = true;
  });
</script>
</body>
</html>
```

# API

## ConvergenceDomUtils.DomBinder
**`constructor(element: HTMLElement, data: RealTimeObject | RealTimeModel, autoBind: boolean = true)`**

Creates a new DomBinder and binds the element to the RealTimeObject. If an instance of RealTimeModel is passed in, the HTMLElemenet will be bound to the root element of the model. The current contents of the element will be replaced by the DOM representation contained in the RealTimeObject. The autoBind parameter configures whether or not the DomBinder will automatically bind upon construction. The default is true.

**`unbind(): void`**

Disconnects the HTMLElement from the RealTimeObject. The element and model will be left as is, but the two-way data binding will be disconnected. This method can only be called when the DomBinder is bound.

**`bind(): void`**

Sets up the two-way data binding between the element and RealTimeObject. This method can only be called when the DomBinder is not already bound.

**`isBound(): boolean`**

Determines if the HTMLElement and RealTimeObject are currently bound.

## ConvergenceDomUtils.DomConverter
**`static htmlToJson(html: string): any`**
Converts a string continaing HTML into the JSON representation of the DOM Tree.

**`static nodeToJson(node: Node): any`**
Converts a DOM Node (e.g. Element, Text) into the JSON representation of the DOM Tree.

**`static jsonToNode(json: any): Node`**
Converts the JSON Representation of a DOM Tree into a DOM Node.
    

# Running the Example
To run the example you must first:

1. Build the distribution
2. Follow the steps in the example/config.example.js file
3. Open the example/index.html file in your browser


Note: to run the example you must have a Convergence Account.
