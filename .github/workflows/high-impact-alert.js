const {
  slackNotification,
  getLocalConfigs,
} = require('./helpers.js');

const main = async (params) => {
  const { context } = params;

  try {
    console.log('Context is', context);
    if (context.payload.label.name === 'high-impact') {
      console.log('High impact label detected, sending Slack notification');
      slackNotification(`:alert: High Impact PR has been opened: <${html_url}|${number}: ${title}>.` +
      `Please prioritize testing the proposed changes.`, process.env.MILO_COMMUNITY_SLACK_WEBHOOK);
    } else {
      console.log('No high impact label detected');
    }
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
