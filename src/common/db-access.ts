import AWS = require('aws-sdk');
import _ = require('underscore');

import { AppLogger } from '../logging/app-logger';
import { BatchGetItemInput, GetItemInput, PutItemInput,
  QueryInput, UpdateItemInput, DeleteItemInput, BatchWriteItemInput } from 'aws-sdk/clients/dynamodb';
import { EnvironmentHelper } from '../utility/environment-helper';
import { Environment } from '../utility/environment';

export class DatabaseAccess {
  private static dynamodb: AWS.DynamoDB.DocumentClient = null;

  public static Init(appLogger: AppLogger) {
    AWS.config.update({
      region: DatabaseAccess.GetRegion(),
      accessKeyId: '',
      secretAccessKey : ''
    });

    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    appLogger.Info('DatabaseAccess Init!');
  }

  private static GetRegion() {
    switch (EnvironmentHelper.GetEnvironment()) {
    case Environment.LIVE:
      return 'us-east-1';
    case Environment.DEV:
      return 'eu-west-1';
    case Environment.LOCAL:
      return 'eu-west-1';
    }
  }

  public static async Put(logger: AppLogger, params: PutItemInput) {
    logger.Info('DB Put: ' + JSON.stringify(params));

    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.put(params, function(error, data) {
        if (!_.isNull(error)) {
          logger.Warn('Error putting data to DB:' + error);
          return reject(error);
        }

        logger.Info('DB Put data:' + JSON.stringify(data));
        return resolve(data.Attributes);
      });
    });
  }

  public static async WriteMany(logger: AppLogger, params: BatchWriteItemInput) {
    logger.Info('DB WriteMany: ' + JSON.stringify(params));

    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.batchWrite(params, function(error, data) {
        if (!_.isNull(error)) {
          logger.Warn('Error putting data to DB:' + error);
          return reject(error);
        }

        if (!_.isEmpty(data.UnprocessedItems)) {
          logger.Warn('Unprocessed items received after WriteMany: ' + JSON.stringify(data.UnprocessedItems));
        }

        logger.Info('DB WriteMany data:' + JSON.stringify(data));
        return resolve(true);
      });
    });
  }

  public static async Get(logger: AppLogger, params: GetItemInput) {
    logger.Info('DB Get: ' + JSON.stringify(params));
    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.get(params, function(error, data) {
        logger.Info('DB Get data not null:' + (data !== null) + ' error: ' + error);
        if (!_.isNull(error)) {
          return reject(error);
        }

        return resolve(data.Item);
      });
    });
  }

  public static async GetMany(logger: AppLogger, params: BatchGetItemInput) {
    logger.Info('DB GetMany: ' + JSON.stringify(params));
    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.batchGet(params, function(error, data) {
        let resultString = '';

        if (data && data.Responses && _.isArray(data.Responses) && data.Responses.length > 0) {
          for (const key in data.Responses) {
            if (data.Responses.hasOwnProperty(key)) {
              const element = data.Responses[key];
              resultString += element.length + ' from ' + key;
            }
          }
        }

        logger.Info('DB GetMany data results: ' + resultString + ' error: ' + error);

        if (!_.isNull(error)) {
          return reject(error);
        }

        if (!_.isEmpty(data.UnprocessedKeys)) {
          logger.Warn('Unprocessed keys received after GetMany: ' + JSON.stringify(data.UnprocessedKeys));
        }

        return resolve(data.Responses);
      });
    });
  }

  public static async Query(logger: AppLogger, params: QueryInput, includeLastEvaluatedKey?: boolean) {
    logger.Info('DB Query: ' + JSON.stringify(params));
    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.query(params, function(error, data) {
        logger.Info('DB Query data not null:' + (data !== null) + ' error: ' + error);
        if (!_.isNull(error)) {
          return reject(error);
        }

        if (includeLastEvaluatedKey) {
          return resolve({
            Items: data.Items,
            LastEvaluatedKey: data.LastEvaluatedKey
          });
        }

        return resolve(data.Items);
      });
    });
  }

  public static async Update(logger: AppLogger, params: UpdateItemInput) {
    logger.Info('DB Update: ' + JSON.stringify(params));
    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.update(params, function(error, data) {
        logger.Info('DB Update data:' + JSON.stringify(data) + ' error: ' + error);
        if (!_.isNull(error)) {
          return reject(error);
        }

        return resolve(data.Attributes);
      });
    });
  }

  public static async Delete(logger: AppLogger, params: DeleteItemInput) {
    logger.Info('DB Delete: ' + JSON.stringify(params));

    const dynamodb = this.dynamodb;
    return new Promise(function(resolve, reject) {
      dynamodb.delete(params, function(error, data) {
        logger.Info('DB Delete data:' + JSON.stringify(data) + ' error: ' + error);
        if (!_.isNull(error)) {
          return reject(error);
        }

        return resolve(data.Attributes);
      });
    });
  }

  public static AddQueryParams(params: QueryInput, partitionKeyName: string,
    queryValue: any, secondaryIndexName: string, keyOnly: boolean,
    limit?: number, descending?: boolean) {
    if (secondaryIndexName) {
      params.IndexName = secondaryIndexName;
    }

    params.ExpressionAttributeNames = { '#partitionKey': partitionKeyName };
    params.ExpressionAttributeValues = { ':partitionValue': queryValue };
    params.KeyConditionExpression = '#partitionKey = :partitionValue';

    if (limit) {
      params.Limit = limit;
    }

    if (descending) {
      params.ScanIndexForward = !descending;
    }

    if (keyOnly) {
      params.ProjectionExpression = partitionKeyName;
    }
  }

  public static AddQuerySecondaryKeyCondition(params: QueryInput,
    sortKeyName: string, sortKeyConditionValue: any, condition: string) {

    params.ExpressionAttributeNames['#sortKey'] = sortKeyName;
    params.ExpressionAttributeValues[':sortValue'] = sortKeyConditionValue;

    if (condition === 'begins_with') {
      params.KeyConditionExpression += ' and begins_with(#sortKey, :sortValue)';
    } else {
      params.KeyConditionExpression += ' and #sortKey ' + condition + ' :sortValue';
    }
  }

  public static AddUpdateParams(params: UpdateItemInput, fieldsToUpdate: object) {
    params.ExpressionAttributeNames = {};
    params.ExpressionAttributeValues = {};
    params.UpdateExpression = 'SET ';

    let index: number = 0;
    for (const property in fieldsToUpdate) {
      if (fieldsToUpdate.hasOwnProperty(property)) {
        params.ExpressionAttributeNames['#' + index] = property;
        params.ExpressionAttributeValues[':' + index] = fieldsToUpdate[property];

        if (index > 0) {
          params.UpdateExpression += ', ';
        }

        params.UpdateExpression += '#' + index + ' = :' + index;

        index++;
      }
    }
  }
}
