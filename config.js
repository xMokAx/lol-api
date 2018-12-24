/**
 * @description
 * configuraton for lol api and champion.gg end points
 *
 */
module.exports = {
  lolapikey: "RGAPI-38260da9-fb3b-4913-923a-54a2600cf925",
  season: "11",
  ggendpoint: "http://api.champion.gg/v2/",
  ggapikey: "1f1cabbb61c44c979853bff44c6a385f",
  port: process.env.PORT || 5000,
  appsecret: "lolgga11jm23j",
  redisPort: 6379,
  redisHost:
    process.env.NODE_ENV === "production"
      ? "loldp.xwlcev.0001.euc1.cache.amazonaws.com"
      : "127.0.0.1"
};
