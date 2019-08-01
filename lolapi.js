const axios = require("axios");
const config = require("./config");
const { lolapikey, lolapiversion, season } = config;

const axiosLol = axios.create({
  method: "get",
  params: {
    api_key: lolapikey
  }
});
function lolRequestConfig(url, params) {
  return {
    url: url,
    params: {
      ...params
    }
  };
}

function fetchSummonerInfo(region, summonerName) {
  return axiosLol(
    `https://${region}.api.riotgames.com/lol/summoner/${lolapiversion}/summoners/by-name/${summonerName}`
  );
}

function fetchSummonerRank(region, summonerId) {
  return axiosLol(
    `https://${region}.api.riotgames.com/lol/league/${lolapiversion}/entries/by-summoner/${summonerId}`
  );
}

function fetchMatchesList(region, accountId, beginIndex, endIndex) {
  return axiosLol(
    lolRequestConfig(
      `https://${region}.api.riotgames.com/lol/match/${lolapiversion}/matchlists/by-account/${accountId}`,
      {
        season: season,
        beginIndex,
        endIndex
      }
    )
  );
}

function fetchMatchDetails(region, matchId) {
  return axiosLol(
    `https://${region}.api.riotgames.com/lol/match/${lolapiversion}/matches/${matchId}`
  );
}

module.exports = {
  fetchSummonerInfo,
  fetchSummonerRank,
  fetchMatchesList,
  fetchMatchDetails
};
