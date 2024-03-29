const express = require("express");
const Redis = require("ioredis");
const CronJob = require("cron").CronJob;
const ggapi = require("./ggapi");
const lolapi = require("./lolapi");
const ddapi = require("./ddapi");
const axios = require("axios");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  silent: true
});
//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.silent = false;
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

// config file
const config = require("./config");
const { appsecret, redisPort, redisHost, port } = config;

const app = express();
const redis = new Redis(redisPort, redisHost);
app.use(helmet());
app.use(cookieParser(appsecret));

let version = "",
  prevVersion = "";
// TODO: prevVersion works correctly but if the server was shutdown prevVersion value will be reset so the requests will be sent
// TODO: send the version to redis
logger.info("Before dataDragon job instantiation");
// "0 0 0 * * 4/3"
const ddJob = new CronJob("0 0 0 * * 4/7", function() {
  const d = new Date();
  logger.info(`thursday and every 7 days: ${d}`);
  // get the previous version from redis
  redis.get("version", function(err, result) {
    if (result) {
      prevVersion = result;
    }
  });

  ddapi
    .getVersions()
    .then(res => {
      // latest lol version
      version = res.data[0];
      // stop the promise chain if the latest version equals the previous version
      if (version === prevVersion) {
        throw new Error("Version was unchanged!!!");
      }
      redis.set("version", version, "EX", 2592000);
      logger.info(`Version was changed: ${version}`);
      // get lol data depending on the latest version
      ddapi
        .getDataDragon(version)
        .then(dataDragon => {
          // add the data to redis as dataDragon
          redis.set("dataDragon", JSON.stringify(dataDragon), "EX", 2592000);
        })
        .catch(err => {
          logger.error("fetching data error handler");
          logger.error(err.message);
          redis.del("version");
        });
    })
    .catch(err => {
      logger.error("catch all error handler");
      logger.error(err.message);
    });
});
logger.info("After dataDragon job instantiation");
ddJob.start();

const ggElo = ["PLATPLUS", "PLATINUM", "GOLD", "SILVER", "BRONZE"];
// TODO: test the new pipeline method
logger.info("Before ggapi job instantiation");
const ggJob = new CronJob("0 0 1/6 * * *", function() {
  const d = new Date();
  logger.info(`00:00 and Every 6 hours: ${d}`);

  ggElo.forEach(elo => {
    axios
      .all([
        ggapi.fetchGeneralInfo(elo),
        ggapi.fetchOverallData(elo),
        ggapi.fetchChampsList(elo),
        ggapi.fetchChampsData(elo)
      ])
      .then(
        axios.spread((general, overall, champsList, champsData) => {
          logger.info(`All ${elo} requests are completed`);
          redis
            .pipeline([
              [
                "set",
                `/ggapi/general/${elo}`,
                JSON.stringify(general.data[0]),
                "EX",
                604800
              ],
              [
                "set",
                `/ggapi/overall/${elo}`,
                JSON.stringify(overall.data[0]),
                "EX",
                604800
              ],
              [
                "set",
                `/ggapi/champsList/${elo}`,
                JSON.stringify(champsList.data),
                "EX",
                604800
              ],
              [
                "set",
                `/ggapi/champsData/${elo}`,
                JSON.stringify(champsData.data),
                "EX",
                604800
              ]
            ])
            .exec();
        })
      )
      .catch(err => {
        logger.error(err.message);
      });
  });
});
logger.info("After ggapi job instantiation");
ggJob.start();

app.use((req, res, next) => {
  const signedCookie = req.signedCookies.lolggapi;
  // if the cookie exists we know he is an existing user and jump to the next middleware
  if (signedCookie) {
    logger.info(`signedCookie exists: ${signedCookie}`);
    next();
  } else {
    // Express headers are auto converted to lowercase
    let token = req.headers["x-access-token"];
    // if the cookie doesn't exist check if a token exist to know he is a first time user to the website
    if (token) {
      if (token.startsWith("Bearer ")) {
        // Remove Bearer from string
        token = token.slice(7, token.length);
      }
      jwt.verify(token, appsecret, (err, decoded) => {
        if (err) {
          logger.error(err.message);
          return res.sendStatus(401);
        } else {
          next();
        }
      });
    } else {
      logger.info("not authorized");
      return res.sendStatus(401);
    }
  }
});

app.get("/datadragon", (request, response) => {
  redis.get("dataDragon", function(err, result) {
    if (result) {
      return response.send(result);
    } else {
      ddapi
        .getVersions()
        .then(res => {
          const version = res.data[0];
          redis.set("version", version, "EX", 2592000);
          ddapi
            .getDataDragon(version)
            .then(dataDragon => {
              redis.set(
                "dataDragon",
                JSON.stringify(dataDragon),
                "EX",
                2592000
              );
              response.send(dataDragon);
            })
            .catch(err => {
              logger.error("fetching data error handler");
              logger.error(err.message);
              redis.del("version");
            });
        })
        .catch(err => {
          logger.error("catch all error handler");
          logger.error(err.message);
        });
    }
  });
});

const ggRedisMiddleWare = (request, response, next) => {
  redis.get(request.path, function(err, result) {
    if (result) {
      logger.info(`Data Found For Path: ${request.path}`);

      response.send(result);
    } else {
      logger.info(`Data Not Found For Path: ${request.path}`);

      next();
    }
  });
};

app.get("/ggapi/general/:elo", ggRedisMiddleWare, (request, response) => {
  const { elo } = request.params;
  ggapi
    .fetchGeneralInfo(elo)
    .then(res => {
      logger.info(`success:  ${request.path}`);

      redis.set(request.path, JSON.stringify(res.data[0]), "EX", 36000);
      return response.send(res.data[0]);
    })
    .catch(err => {
      logger.error(err.message);

      if (err.response) {
        return response.sendStatus(err.response.status);
      }
      return response.sendStatus(500);
    });
});

app.get("/ggapi/overall/:elo", ggRedisMiddleWare, (request, response) => {
  const { elo } = request.params;
  ggapi
    .fetchOverallData(elo)
    .then(res => {
      logger.info(`success:  ${request.path}`);

      redis.set(request.path, JSON.stringify(res.data[0]), "EX", 36000);
      return response.send(res.data[0]);
    })
    .catch(err => {
      logger.error(err.message);

      if (err.response) {
        return response.sendStatus(err.response.status);
      }
      return response.sendStatus(500);
    });
});

app.get("/ggapi/champsList/:elo", ggRedisMiddleWare, (request, response) => {
  const { elo } = request.params;
  ggapi
    .fetchChampsList(elo)
    .then(res => {
      logger.info(`success:  ${request.path}`);

      redis.set(request.path, JSON.stringify(res.data), "EX", 36000);
      return response.send(res.data);
    })
    .catch(err => {
      logger.error(err.message);

      if (err.response) {
        return response.sendStatus(err.response.status);
      }
      return response.sendStatus(500);
    });
});

app.get("/ggapi/champsData/:elo", ggRedisMiddleWare, (request, response) => {
  const { elo } = request.params;
  ggapi
    .fetchChampsData(elo)
    .then(res => {
      logger.info(`success:  ${request.path}`);

      redis.set(request.path, JSON.stringify(res.data), "EX", 36000);
      return response.send(res.data);
    })
    .catch(err => {
      logger.error(err.message);

      if (err.response) {
        return response.sendStatus(err.response.status);
      }
      return response.sendStatus(500);
    });
});

app.get("/ggapi/champData/:elo/:id", ggRedisMiddleWare, (request, response) => {
  const { elo, id } = request.params;
  ggapi
    .fetchChampData(elo, id)
    .then(res => {
      logger.info(`success:  ${request.path}`);

      redis.set(request.path, JSON.stringify(res.data), "EX", 21600);
      return response.send(res.data);
    })
    .catch(err => {
      logger.error(err.message);

      if (err.response) {
        return response.sendStatus(err.response.status);
      }
      return response.sendStatus(500);
    });
});

app.get(
  "/ggapi/matchup/:elo/:id/:enemy/:role",
  ggRedisMiddleWare,
  (request, response) => {
    const { elo, id, enemy, role } = request.params;
    ggapi
      .fetchMatchup(elo, id, enemy, role)
      .then(res => {
        logger.info(`success:  ${request.path}`);
        redis.set(request.path, JSON.stringify(res.data), "EX", 21600);
        return response.send(res.data);
      })
      .catch(err => {
        logger.error(err.message);
        if (err.response) {
          return response.sendStatus(err.response.status);
        }
        return response.sendStatus(500);
      });
  }
);

const lolRedisMiddleware = (request, response, next) => {
  logger.info(request.path);
  logger.info(request.params);
  request.params.summonerName = encodeURIComponent(request.params.summonerName);
  const { region, summonerName } = request.params;
  if (request.query.update) {
    logger.info(request.query);
    const keys = [
      `/lolapi/summoner/${region}/${summonerName}`,
      `/lolapi/rank/${region}/${summonerName}`,
      `/lolapi/matchesList/${region}/${summonerName}/0/10`
    ];
    redis.unlink(keys).then(n => {
      logger.info("Keys Deleted:", n);
      next();
    });
  } else if (request.query.timestamp) {
    logger.info(request.query);
    redis.get(request.path, function(err, result) {
      if (result) {
        if (request.query.timestamp == JSON.parse(result).timestamp) {
          logger.info("Matches Are Ordered");

          response.send(result);
        } else {
          logger.info("Matches Not Ordered");

          next();
        }
      } else {
        logger.info("Matches Not Found");

        next();
      }
    });
  } else {
    redis.get(request.path, function(err, result) {
      if (result) {
        response.send(result);
      } else {
        next();
      }
    });
  }
};

app.get(
  "/lolapi/summoner/:region/:summonerName",
  lolRedisMiddleware,
  (request, response) => {
    let { region, summonerName } = request.params;
    lolapi
      .fetchSummonerInfo(region, summonerName)
      .then(res => {
        logger.info(`success:  ${request.path}`);

        const lastUpdated = Date.now();
        redis.set(
          request.path,
          JSON.stringify({ lastUpdated, ...res.data }),
          "EX",
          2592000
        );
        return response.send({ lastUpdated, ...res.data });
      })
      .catch(err => {
        logger.error(err.message);

        if (err.response) {
          logger.error(err.response.data);
          const status_code = err.response.data.status.status_code;
          return response.sendStatus(status_code);
        } else {
          logger.error(err.code);
          return response.sendStatus(400);
        }
      });
  }
);

app.get(
  "/lolapi/rank/:region/:summonerName",
  lolRedisMiddleware,
  (request, response) => {
    const region = request.params.region;
    const summonerId = request.query.summonerId;
    lolapi
      .fetchSummonerRank(region, summonerId)
      .then(res => {
        logger.info(`success: ${request.path}`);

        redis.set(request.path, JSON.stringify(res.data), "EX", 2592000);
        return response.send(res.data);
      })
      .catch(err => {
        logger.error(err.message);

        if (err.response) {
          logger.error(err.response.data);
          const status_code = err.response.data.status.status_code;
          return response.sendStatus(status_code);
        } else {
          logger.error(err.code);
          return response.sendStatus(400);
        }
      });
  }
);

app.get(
  "/lolapi/matchesList/:region/:summonerName/:beginIndex/:endIndex",
  lolRedisMiddleware,
  (request, response) => {
    const { region, beginIndex, endIndex } = request.params;
    const accountId = request.query.accountId;
    lolapi
      .fetchMatchesList(region, accountId, beginIndex, endIndex)
      .then(res => {
        logger.info(`success:  ${request.path}`);

        if (request.query.timestamp) {
          res.data.timestamp = request.query.timestamp;
        }
        redis.set(request.path, JSON.stringify(res.data), "EX", 2592000);
        return response.send(res.data);
      })
      .catch(err => {
        logger.error(err.message);

        if (err.response) {
          logger.error(err.response.data);
          const status_code = err.response.data.status.status_code;
          return response.sendStatus(status_code);
        } else {
          logger.error(err.code);
          return response.sendStatus(400);
        }
      });
  }
);

app.get(
  "/lolapi/match/:region/:matchId",
  lolRedisMiddleware,
  (request, response) => {
    const { region, matchId } = request.params;
    lolapi
      .fetchMatchDetails(region, matchId)
      .then(res => {
        logger.info(`success:  ${request.path}`);

        redis.set(request.path, JSON.stringify(res.data), "EX", 2592000);
        return response.send(res.data);
      })
      .catch(err => {
        logger.error(err.message);

        if (err.response) {
          logger.error(err.response.data);
          const status_code = err.response.data.status.status_code;
          return response.sendStatus(status_code);
        } else {
          logger.error(err.code);
          return response.sendStatus(400);
        }
      });
  }
);

app.listen(port, function(err) {
  if (err) {
    logger.error(err.message);
  } else {
    logger.info(`server listening on port ${port}`);
  }
});
