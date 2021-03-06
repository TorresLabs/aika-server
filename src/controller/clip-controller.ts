import httpStatus = require('http-status-codes');
import _ = require('underscore');
import moment = require('moment');

import { AppLogger } from '../logging/app-logger';
import { ClipError } from '../error-codes/clip-error';
import { PodcastQuery } from '../queries/podcast-query';
import { ClipQuery } from '../queries/clip-query';

export class ClipController {
  public static async CreateClip(logger: AppLogger, accountId: string, episodeId: string, clipData: any) {
    if (!accountId) {
      return {
        msg: {
          error: 'Account id is missing!',
          errorCode: ClipError.ACCOUNT_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    if (!episodeId) {
      return {
        msg: {
          error: 'Episode is missing!',
          errorCode: ClipError.EPISODE_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    if (!clipData ||
      !_.has(clipData, 'title') || clipData.title.length === 0 ||
      !_.has(clipData, 'startTime') || _.isNaN(clipData.startTime) ||
      !_.has(clipData, 'endTime') || _.isNaN(clipData.endTime)) {
      return {
        msg: {
          error: 'Clip data is incomplete! Title, start- and end-time is required.',
          errorCode: ClipError.CLIP_DATA_INCOMPLETE
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    // check if start time is smaller than end time
    if (clipData.startTime < 0 || clipData.startTime >= clipData.endTime) {
      return {
        msg: {
          error: 'Clip times are incorrect. Must be above zero and end time must be bigger than start time.',
          errorCode: ClipError.CLIP_TIMES_ARE_INCORRECT
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    const podcastId = episodeId.substring(0, 36);
    const index = parseInt(episodeId.substring(36), 10);

    // get episode and therefore check if it exists
    const episodes = await PodcastQuery.GetEpisodes(logger, [{podcastId, index}]);

    if (!episodes || !_.isArray(episodes) || episodes.length === 0 || !episodes[0]) {
      return {
        msg: {
          error: 'Episode to create clip from doesn\'t exist!',
          errorCode: ClipError.EPISODE_DOESNT_EXIST
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    const episodeData = episodes[0];

    // TODO: check if start and end time are in the duration of the episode when durations can be trusted.

    // get last recorded clip of that episode of that user for index
    const lastEpisodeClipFromUser = await ClipQuery.GetEpisodeClipsFromUser(logger, accountId, episodeId, 1);

    let clipTimestamp = parseInt(moment.utc().format('X'), 10);

    let clipIndex = 0;
    if (lastEpisodeClipFromUser && _.isArray(lastEpisodeClipFromUser) &&
      lastEpisodeClipFromUser.length > 0 && lastEpisodeClipFromUser[0]) {

      const splitAccountWithIndex = lastEpisodeClipFromUser[0].ACCIDX.split('_');
      clipIndex = parseInt(splitAccountWithIndex[1], 10) + 1;

      if (lastEpisodeClipFromUser[0].CLPTS >= clipTimestamp) {
        clipTimestamp = lastEpisodeClipFromUser[0].CLPTS + 1;
      }
    }

    // construct clip db object
    const clipDatabaseObject: any = {
      ACCID: accountId,
      ACCIDX: accountId + '_' + clipIndex,
      CLPTS: clipTimestamp,
      EID: episodeId,
      ENDT: clipData.endTime,
      STRT: clipData.startTime,
      TITL: clipData.title
    };

    if (clipData.notes) {
      clipDatabaseObject.NTS = clipData.notes;
    }

    // store clip object
    await ClipQuery.StoreClip(logger, clipDatabaseObject);

    // return clip object to client
    return {
      msg: this.CreateClipResonseMessage(clipDatabaseObject),
      statusCode: httpStatus.CREATED
    };
  }

  public static async ChangeClipData(logger: AppLogger, accountId: string, clipId: string, changedClipData: any) {
    if (!accountId) {
      return {
        msg: {
          error: 'Account id is missing!',
          errorCode: ClipError.ACCOUNT_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    if (!clipId) {
      return {
        msg: {
          error: 'Clip is missing!',
          errorCode: ClipError.CLIP_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    if (!changedClipData || (!changedClipData.title && !changedClipData.notes)) {
      return {
        msg: {
          error: 'Updated clip data is missing!',
          errorCode: ClipError.UPDATED_CLIP_DATA_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    // clipId =  clipDatabaseObject.EID + '_' + clipDatabaseObject.ACCIDX,
    const splitClipId = clipId.split('_');

    if (!splitClipId || !_.isArray(splitClipId) || splitClipId.length !== 3) {
      return {
        msg: {
          error: 'Updated clip data is missing!',
          errorCode: ClipError.CLIP_ID_INVALID
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    const episodeId = splitClipId[0];
    const accountIdWithIndex = splitClipId[1] + '_' + splitClipId[2];

    const databaseObjectChanges: any = {};

    if (changedClipData.title) {
      databaseObjectChanges.TITL = changedClipData.title;
    }

    if (changedClipData.notes) {
      databaseObjectChanges.NTS = changedClipData.notes;
    }

    const updatedClipData = await ClipQuery.UpdateEpisodeClipFromUser(logger,
      accountIdWithIndex, episodeId, databaseObjectChanges);

    if (!updatedClipData) {
      return {
        msg: {
          error: 'Clip data does\'nt exist!',
          errorCode: ClipError.CLIP_DATA_DOESNT_EXIST
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    return {
      msg: this.CreateClipResonseMessage(updatedClipData),
      statusCode: httpStatus.OK
    };
  }

  public static async GetClip(logger: AppLogger, clipId: string) {
    if (!clipId) {
      return {
        msg: {
          error: 'Clip is missing!',
          errorCode: ClipError.CLIP_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    // clipId =  clipDatabaseObject.EID + '_' + clipDatabaseObject.ACCIDX,
    const splitClipId = clipId.split('_');

    if (!splitClipId || !_.isArray(splitClipId) || splitClipId.length !== 3) {
      return {
        msg: {
          error: 'Updated clip data is missing!',
          errorCode: ClipError.CLIP_ID_INVALID
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    const episodeId = splitClipId[0];
    const accountIdWithIndex = splitClipId[1] + '_' + splitClipId[2];

    const clipData = await ClipQuery.GetClip(logger, accountIdWithIndex, episodeId);

    return {
      msg: this.CreateClipResonseMessage(clipData),
      statusCode: httpStatus.OK
    };
  }

  public static async GetClipsCreatedByUser(logger: AppLogger, accountId: string, nextToken: string) {
    if (!accountId) {
      return {
        msg: {
          error: 'Account id is missing!',
          errorCode: ClipError.ACCOUNT_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    let oldestFollowTimestamp;
    if (nextToken) {
      const decodedToken = Buffer.from(nextToken, 'base64').toString('utf8');
      const parsedInt = parseInt(decodedToken, 10);

      if (parsedInt && !_.isNaN(parsedInt)) {
        oldestFollowTimestamp = parsedInt;
      }
    }

    const pageSize = 5;
    const clipsFromUser = await ClipQuery.GetClipsFromUser(logger, accountId, oldestFollowTimestamp, pageSize);

    let nextNextToken = null;

    if (clipsFromUser && _.isArray(clipsFromUser) && clipsFromUser.length === pageSize) {
      const nextOldestClipTimestamp = clipsFromUser[clipsFromUser.length - 1].CLPTS;
      nextNextToken = Buffer.from(nextOldestClipTimestamp.toString()).toString('base64');
    }

    const responseMessage = _.map(clipsFromUser, (clip) => {
      return this.CreateClipResonseMessage(clip);
    });

    return {
      msg: {
        result: responseMessage,
        nextToken: nextNextToken
      },
      statusCode: httpStatus.OK
    };
  }

  public static async GetClipsOfEpisodeCreatedByUser(logger: AppLogger,
    accountId: string, episodeId: string, nextToken: string) {
    if (!accountId) {
      return {
        msg: {
          error: 'Account id is missing!',
          errorCode: ClipError.ACCOUNT_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    if (!episodeId) {
      return {
        msg: {
          error: 'Episode is missing!',
          errorCode: ClipError.EPISODE_ID_MISSING
        },
        statusCode: httpStatus.BAD_REQUEST
      };
    }

    let lastLastEvaluatedKey;
    if (nextToken) {
      lastLastEvaluatedKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
    }

    const pageSize = 5;
    const getEpisodeClipsFromUserResult = await ClipQuery.GetEpisodeClipsFromUser(
      logger, accountId, episodeId, pageSize, lastLastEvaluatedKey, true);

    const clipsOfEpisode = getEpisodeClipsFromUserResult.Items;

    let nextNextToken = null;

    if (getEpisodeClipsFromUserResult && getEpisodeClipsFromUserResult.LastEvaluatedKey) {
      nextNextToken = Buffer.from(JSON.stringify(getEpisodeClipsFromUserResult.LastEvaluatedKey)).toString('base64');
    }

    const responseMessage = _.map(clipsOfEpisode, (clip) => {
      return this.CreateClipResonseMessage(clip);
    });

    return {
      msg: {
        result: responseMessage,
        nextToken: nextNextToken
      },
      statusCode: httpStatus.OK
    };
  }

  private static CreateClipResonseMessage(clipDatabaseObject: any) {
    return {
      clipId: clipDatabaseObject.EID + '_' + clipDatabaseObject.ACCIDX,
      creatorAccountId: clipDatabaseObject.ACCID,
      episodeId: clipDatabaseObject.EID,
      creationTimestamp: clipDatabaseObject.CLPTS,
      startTime: clipDatabaseObject.STRT,
      endTime: clipDatabaseObject.ENDT,
      title: clipDatabaseObject.TITL,
      notes: clipDatabaseObject.NTS ? clipDatabaseObject.NTS : ''
    };
  }
}
