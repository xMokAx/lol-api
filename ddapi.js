const axios = require("axios");

function getVersions() {
  return axios.get("https://ddragon.leagueoflegends.com/api/versions.json");
}

function getDataDragon(version) {
  return axios
    .all([
      axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/championFull.json`
      ),
      axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
      ),
      axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`
      ),
      axios.get(
        `http://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`
      )
    ])
    .then(
      axios.spread((championsRes, itemsRes, summonerSpellsRes, runesRes) => {
        let champs = {},
          items = {},
          summonerSpells = {},
          runes = {};
        championsData = championsRes.data.data;

        Object.keys(championsData).forEach(champ => {
          const {
            key,
            id,
            name,
            title,
            tags,
            spells,
            passive,
            stats
          } = championsData[champ];
          champs[key] = {
            id: key,
            name: id,
            gameName: name,
            title,
            tags,
            spells: spells.map(spell => ({
              id: spell.id,
              name: spell.name,
              description: spell.description,
              cooldown: spell.cooldownBurn
            })),
            passive: {
              name: passive.name,
              description: passive.description,
              icon: passive.image.full
            },
            stats
          };
        });

        itemsData = itemsRes.data.data;
        Object.keys(itemsData).forEach(item => {
          const { name, description, plaintext, gold } = itemsData[item];
          items[item] = {
            name,
            description,
            plaintext,
            gold
          };
        });

        summonerSpellsData = summonerSpellsRes.data.data;
        Object.keys(summonerSpellsData).forEach(summonerSpell => {
          const {
            key,
            id,
            name,
            description,
            summonerLevel,
            cooldownBurn
          } = summonerSpellsData[summonerSpell];
          summonerSpells[key] = {
            name: id,
            gameName: name,
            description,
            summonerLevel,
            cooldown: cooldownBurn
          };
        });

        runesData = runesRes.data;
        runesData.forEach(path => {
          const { id, key, name, icon, slots } = path;
          runes[id] = {
            id,
            key,
            name,
            icon
          };
          slots.forEach(slot => {
            slot.runes.forEach(rune => {
              runes[rune.id] = rune;
            });
          });
        });
        return {
          version,
          champs,
          items,
          runes,
          summonerSpells
        };
      })
    );
}

module.exports = {
  getVersions,
  getDataDragon
};
