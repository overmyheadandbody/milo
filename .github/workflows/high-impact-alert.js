const {
  slackNotification,
  getLocalConfigs,
} = require('./helpers.js');

const main = async (params) => {
  const { context } = params;

  try {
    if (context.payload.label.name === 'high-impact') {
      const { html_url, number, title } = context.payload.pull_request;
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
