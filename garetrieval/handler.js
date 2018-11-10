'use strict';

const { google } = require('googleapis');
const AWS = require('aws-sdk');

const S3 = new AWS.S3({
  region: 'us-east-1',
});

const gaViewId = '176113930';

function mapReportToRows(report) {
  const result = [];

  let dimensionHeaders;
  if (report.columnHeader.dimensions) {
    dimensionHeaders = [...report.columnHeader.dimensions];
  }
  const metricHeaders = report.columnHeader.metricHeader.metricHeaderEntries.map(x => x.name);
  // const columns = [...dimensionHeaders, ...metricHeaders];
  // console.log(columns);
  report.data.rows.forEach(({ dimensions, metrics }) => {
    const row = {};
    if (dimensions) {
      dimensions.forEach((dim, i) => {
        row[dimensionHeaders[i]] = dim;
      });
    }
    metrics[0].values.forEach((m, i) => {
      row[metricHeaders[i]] = m;
    });

    result.push(row);
  });

  return result;
}

module.exports.main = async (event, context) => {
  const auth = await google.auth.getClient({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  });

  const analyticsreporting = google.analyticsreporting({
    version: 'v4',
    auth,
  });

  const response = await analyticsreporting.reports.batchGet({
    requestBody: {
      reportRequests: [
        {
          viewId: gaViewId,
          dateRanges: [{ 'startDate': '2018-11-09', endDate: '2018-11-10' }],
          metrics: [
            { expression: 'ga:users' },
            { expression: 'ga:newUsers' },
            { expression: 'ga:percentNewSessions' },
            { expression: 'ga:sessionsPerUser' },
          ],
          // dimensions: [
          // { name: 'ga:userType' },
          // { name: 'ga:sessionCount' },
          // { name: 'ga:daysSinceLastSession' },
          // ],
        },
      ],
    },
  });
  const rows = mapReportToRows(response.data.reports[0]);

  const params = {
    Body: rows.map(JSON.stringify).join('\n'),
    Bucket: 'hackcincy2018-ga-archive',
    Key: 'usermetrics',
  };
  await S3.putObject(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };
};
