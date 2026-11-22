'use strict';

// The UI is kept as an ES module so local peripheral models can be imported
// without a CDN or server-side runtime.
import("./app.mjs").catch((error) => {
  console.error("Cardputer ADV Virtual could not start:", error);
  const status = document.querySelector("#session-state");
  if (status) status.textContent = "Erreur de chargement de l’interface";
});
