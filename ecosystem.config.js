module.exports = {
  apps: [
    {
      name: "lolapi",
      script: "./index.js"
    }
  ],
  deploy: {
    production: {
      user: "ubuntu",
      host: "ec2-18-196-101-204.eu-central-1.compute.amazonaws.com",
      key: "C:/Users/Moka/.ssh/lol-app.pem",
      ref: "origin/master",
      repo: "https://git-codecommit.eu-central-1.amazonaws.com/v1/repos/lolapi",
      path: "/lolapi",
      "post-deploy": "yarn install && pm2 startOrRestart ecosystem.config.js"
    }
  }
};
