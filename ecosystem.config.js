module.exports = {
  apps: [
    {
      name: "lolapi",
      script: "yarn",
      args: "start"
    }
  ],
  deploy: {
    production: {
      user: "Administrator",
      host: "ec2-18-197-176-168.eu-central-1.compute.amazonaws.com",
      key: "C:/Users/Moka/.ssh/lol-app.pem",
      ref: "origin/master",
      repo: "https://git-codecommit.eu-central-1.amazonaws.com/v1/repos/lolapi",
      path: "C:/Users/Administrator/Desktop/lolapi",
      "post-deploy":
        "yarn install && pm2 startOrRestart ecosystem.config.js --env production"
    }
  }
};
