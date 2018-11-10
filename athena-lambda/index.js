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
    let metric = '';
    rs
      .pipe(csv()
      .on('data', (data) => {
        const row = JSON.parse(data.toString('utf8'));
        // {"ga:newusers":"2"}
        const columns = Object.keys(row);
        if (columns.length !== 1) {
          throw new Error("Queries must return only one column.");
        }
        metric = row[columns[0]];
      }))
      .on('done', () => resolve(metric))
      .on('error', reject);
  });
}

async function upsertDynamo(queryKey, metric) {
  const dynamoClient = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION,
  });

  const params = {
    TableName: 'hackcincy2018_metrics',
    Item: {
      'metric': queryKey,
      'value': metric
    }
  };

  dynamoClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
    }
  });
}

module.exports.handler = async (event, context, cb) => {
  const queryKey = "new_users";
  // run query
  const query = process.env.ATHENA_QUERY;
  const db = process.env.ATHENA_DB;
  const outputLocation = process.env.ATHENA_OUTPUT_LOCATION;
  const athenaResult = await queryAthena(query, db, outputLocation);
  console.log(athenaResult);
  // upsert into dynamo
  await upsertDynamo(queryKey, athenaResult);
};
