const editable = document.getElementById("editable");
const editable2 = document.getElementById("editable2");

Convergence.connectAnonymously(DOMAIN_URL).then(function (domain) {
  return domain.models().open("content-editable", "test", function () {
    return ConvergenceDomUtils.DomConverter.htmlToJson(
      "Here is some initial text with a <b>bold</b> section and some <i>italics</i>."
    );
  });
}).then(function (model) {
  const binder = new ConvergenceDomUtils.DomBinder(editable, model.root());
  editable.contentEditable = true;
});

Convergence.connectAnonymously(DOMAIN_URL).then(function (domain) {
  return domain.models().open("content-editable", "test2", function () {
    return ConvergenceDomUtils.DomConverter.htmlToJson(
      "Here is some initial text with a <b>bold</b> section and some <i>italics</i>."
    );
  });
}).then(function (model) {
  const binder = new ConvergenceDomUtils.DomBinder(editable2, model.root());
  editable2.contentEditable = true;
});
