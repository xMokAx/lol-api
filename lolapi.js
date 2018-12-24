const axios = require("axios");
const config = require("./config");
const { lolapikey, season } = config;

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
    `https://${region}.api.riotgames.com/lol/summoner/v3/summoners/by-name/${summonerName}`
  );
}

function fetchSummonerRank(region, summonerId) {
  return axiosLol(
    `https://${region}.api.riotgames.com/lol/league/v3/positions/by-summoner/${summonerId}`
  );
}

function fetchMatchesList(region, accountId, beginIndex, endIndex) {
  return axiosLol(
    lolRequestConfig(
      `https://${region}.api.riotgames.com/lol/match/v3/matchlists/by-account/${accountId}`,
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
    `https://${region}.api.riotgames.com/lol/match/v3/matches/${matchId}`
  );
}

module.exports = {
  fetchSummonerInfo,
  fetchSummonerRank,
  fetchMatchesList,
  fetchMatchDetails
};
