const PoziviAjaxFetch = (function () {
  // Šalje zahtjev i poziva callback(statusniKod, objekatOdgovora), i u slučaju greške
  function posalji(metoda, url, tijelo, callback) {
    const opcije = { method: metoda, headers: {} };
    if (tijelo !== undefined) {
      opcije.headers["Content-Type"] = "application/json";
      opcije.body = JSON.stringify(tijelo);
    }
    fetch(url, opcije)
      .then(
        (odgovor) => odgovor.json().catch(() => ({})).then((podaci) => ({ status: odgovor.status, podaci })),
        () => ({ status: 0, podaci: { message: "Server nije dostupan!" } })
      )
      .then((rez) => callback(rez.status, rez.podaci));
  }

  const api = (scenarioId) => `/api/scenarios/${scenarioId}`;

  return {
    postScenario: function (title, callback) {
      posalji("POST", "/api/scenarios", { title }, callback);
    },
    lockLine: function (scenarioId, lineId, userId, callback) {
      posalji("POST", `${api(scenarioId)}/lines/${lineId}/lock`, { userId }, callback);
    },
    updateLine: function (scenarioId, lineId, userId, newText, callback) {
      posalji("PUT", `${api(scenarioId)}/lines/${lineId}`, { userId, newText }, callback);
    },
    lockCharacter: function (scenarioId, characterName, userId, callback) {
      posalji("POST", `${api(scenarioId)}/characters/lock`, { userId, characterName }, callback);
    },
    updateCharacter: function (scenarioId, userId, oldName, newName, callback) {
      posalji("POST", `${api(scenarioId)}/characters/update`, { userId, oldName, newName }, callback);
    },
    getDeltas: function (scenarioId, since, callback) {
      posalji("GET", `${api(scenarioId)}/deltas?since=${since}`, undefined, callback);
    },
    getScenario: function (scenarioId, callback) {
      posalji("GET", api(scenarioId), undefined, callback);
    },
  };
})();