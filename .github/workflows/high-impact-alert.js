const {
  slackNotification,
  getLocalConfigs,
} = require('./helpers.js');

const main = async (params) => {
  github = params.github;

  try {
    console.log('github data is', github);
    console.log('context data is', params.context);
    // slackNotification('Testing Bar', process.env.MILO_COMMUNITY_SLACK_WEBHOOK);
  } catch (error) {
    console.error(error);
  }
};

if (process.env.LOCAL_RUN) {
  const { github, context } = getLocalConfigs();
  main({
    github,
    context,
  });
}

module.exports = main;
