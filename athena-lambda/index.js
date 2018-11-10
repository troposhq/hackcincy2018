const AWS = require('aws-sdk');
const sleep = require('sleep-promise');
const csv =require('csvtojson');
const AmazonS3URI = require('amazon-s3-uri')

async function queryAthena(query, db, bucket) {
  const athenaClient = new AWS.Athena({
    region: process.env.REGION,
  });
  const s3Client = new AWS.S3({
    region: process.env.REGION,
  });

  const params = {
    QueryString: query, /* required */
    ResultConfiguration: { /* required */
      OutputLocation: bucket, /* required */
      EncryptionConfiguration: {
        EncryptionOption: 'SSE_S3', /* required */
      }
    },
    QueryExecutionContext: {
      Database: db,
    }
  };
  const response = await athenaClient.startQueryExecution(params).promise();

  let queryRunning = 0;
  let resultsFile;
  while (queryRunning === 0) {
    await sleep(2000);
    const status = await athenaClient.getQueryExecution({ QueryExecutionId: response.QueryExecutionId }).promise();
    resultsFile = status.QueryExecution.ResultConfiguration.OutputLocation;
    if (status.QueryExecution.Status.State !== 'RUNNING') {
      queryRunning = 1;
    }
  }

  const { bucket: resultsBucket, key: resultsKey } = AmazonS3URI(resultsFile);
  console.log(resultsBucket, resultsKey)
  const s3Params = {
    Bucket: resultsBucket,
    Key: resultsKey,
  };

  const s3Object = s3Client.getObject(s3Params).createReadStream();

  return parseMetric(s3Object);
}

function parseMetric(rs) {
  return new Promise((resolve, reject) => {
    let metric = 0;
    rs
      .pipe(csv()
      .on('data', (data) => {
        const row = data.toString('utf8');
        // TODO: parse row and set metric
        console.log(row);
      }))
      .on('done', () => resolve(metric))
      .on('error', reject);
  });
}

function upsertDynamo() {
}

module.exports.handler = async (event, context, cb) => {
  // run query
  const query = process.env.ATHENA_QUERY;
  const db = process.env.ATHENA_DB;
  const outputLocation = process.env.ATHENA_OUTPUT_LOCATION;
  const athenaResult = await queryAthena(query, db, outputLocation);
  console.log(athenaResult);
  // upsert into dynamo
};
