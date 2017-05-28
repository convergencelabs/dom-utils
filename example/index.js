const editable = document.getElementById("editable");

Convergence.connectAnonymously(DOMAIN_URL).then(function (domain) {
  return domain.models().openAutoCreate({
    id: "content-editable",
    collection: "test",
    data: () => {
      return ConvergenceDomUtils.DomConverter.htmlToJson(
        "Here is some initial text with a <b>bold</b> section and some <i>italics</i>."
      );
    }
  });
}).then(function (model) {
  const binder = new ConvergenceDomUtils.DomBinder(editable, model.root());
  editable.contentEditable = true;
});
