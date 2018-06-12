import _ = require('underscore');

import { DatabaseAccess } from '../common/db-access';
import { AppLogger } from '../logging/app-logger';
import to from '../utility/to';
import { AsyncResult } from '../utility/to';

export class PodcastQuery {
  public static async GetPodcasts(logger: AppLogger, podcastIds: string[]) {
    if (!podcastIds) {
      return null;
    }

    const keys = new Array();

    for (const podcastId of podcastIds) {
      keys.push({ PID: podcastId });
    }

    const params = {
      RequestItems: {
        PODCASTS: {
          Keys: keys
        }
      }
    };

    const asyncResult = await to(DatabaseAccess.GetMany(logger, params));

    if (asyncResult.error) {
      throw asyncResult.error;
    }

    return asyncResult.result.PODCASTS;
  }

  public static async GetEpisodes(logger: AppLogger, podcastId: string) {
    if (!podcastId) {
      return null;
    }

    const params: any = {
      TableName: 'EPISODES'
    };

    // TODO: Add pagination support
    DatabaseAccess.AddQueryParams(params, 'PID', podcastId, null, false, 30);

    const asyncResult = await to(DatabaseAccess.Query(logger, params));

    if (asyncResult.error) {
      throw asyncResult.error;
    }

    return asyncResult.result;
  }

  public static async GetFollowedPodcastEntries(logger: AppLogger, accoundId: string, oldestFollowTimestamp?: number) {

    const params: any = {
      TableName: 'FLWDPODCASTS'
    };

    DatabaseAccess.AddQueryParams(params, 'ACCID', accoundId, null, false, 100);

    if (oldestFollowTimestamp) {
      // Since the followtimestamp is never changed (re-follow is new entry with new ts)
      // this ensures secures non-duplicate pagination.
      DatabaseAccess.AddQuerySecondaryKeyCondition(params, 'FLWTS', oldestFollowTimestamp, '>');
    }

    const asyncResult = await to(DatabaseAccess.Query(logger, params));

    if (asyncResult.error) {
      throw asyncResult.error;
    }

    return asyncResult.result;
  }
}