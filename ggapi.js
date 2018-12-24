const axios = require("axios");
const config = require("./config");
const { ggendpoint, ggapikey } = config;

const axiosGg = axios.create({
  method: "get",
  baseURL: ggendpoint,
  params: {
    api_key: ggapikey
  }
});
function ggRequestConfig(url, params) {
  return {
    url: url,
    params: {
      ...params
    }
  };
}

function fetchGeneralInfo(elo) {
  return axiosGg.request(ggRequestConfig("general", { elo }));
}

function fetchOverallData(elo) {
  return axiosGg.request(ggRequestConfig("overall", { elo }));
}

function fetchChampsList(elo) {
  return axiosGg.request(
    ggRequestConfig("champions", { elo, abridged: true, limit: "200" })
  );
}

function fetchChampsData(elo) {
  return axiosGg.request(
    ggRequestConfig("champions", {
      elo,
      limit: "300",
      champData:
        "kda,averageGames,damage,totalHeal,sprees,minions,goldEarned,positions"
    })
  );
}

function fetchChampData(elo, id) {
  return axiosGg.request(
    ggRequestConfig(`champions/${id}`, {
      elo,
      champData:
        "hashes,winsByMatchLength,winsByMatchesPlayed,kda,damage,averageGames,totalHeal,sprees,minions,goldEarned,positions,normalized,maxMins,matchups"
    })
  );
}

function fetchMatchup(elo, id, enemy, role) {
  return axiosGg.request(
    ggRequestConfig(`/champions/${id}/matchups/${enemy}/${role}`, {
      elo
    })
  );
}

module.exports = {
  fetchChampsList,
  fetchGeneralInfo,
  fetchOverallData,
  fetchChampsData,
  fetchChampData,
  fetchMatchup
};
