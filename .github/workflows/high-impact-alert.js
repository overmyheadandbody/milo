const {
  slackNotification,
  getLocalConfigs,
} = require('./helpers.js');

const main = async (params) => {
  const { context } = params;

  try {
    if (context.payload.label.name === 'high-impact') {
      console.log('High impact label detected');
    } else {
      console.log('No high impact label detected');
    }
    // html_url
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
