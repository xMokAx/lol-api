/**
 * @description
 * configuraton for lol api and champion.gg end points
 *
 */
module.exports = {
  lolapikey: "RGAPI-d097cabf-f0b9-4c73-a0d8-d53c832b4a58",
  season: "11",
  ggendpoint: "http://api.champion.gg/v2/",
  ggapikey: "1f1cabbb61c44c979853bff44c6a385f",
  port: process.env.PORT || 5000,
  appsecret: "lolgga11jm23j",
  redisPort: 6379,
  redisHost:
    process.env.NODE_ENV === "production"
      ? "lol-dp.xwlcev.0001.euc1.cache.amazonaws.com"
      : "127.0.0.1"
};
