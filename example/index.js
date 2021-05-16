new MediumEditor('.edit');
const editable = document.getElementById("editable");

Convergence.connectAnonymously(DOMAIN_URL).then(function (domain) {
  return domain.models().openAutoCreate({
    id: "content-editable",
    collection: "content-editable-test",
    data: () => {
      return ConvergenceDomUtils.DomConverter.htmlToJson(
        `Here is some initial text with a <b>bold</b> section and some <i>italics</i>.`
      );
    }
  });
}).then(function (model) {
  new ConvergenceDomUtils.DomBinder(editable, model.root());
  editable.contentEditable = "true";
});
