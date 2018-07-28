import { NextFunction } from 'express';

import express = require('express');
const router = express.Router();

import { PodcastController } from '../controller/podcast-controller';
import { AppLogger } from '../logging/app-logger';
import { Response } from '../common/response';

/**
 * @api {get} /podcast?id /?id
 * @apiName /podcast?id
 * @apiDescription Gets the podcast data with the given PID.
 * @apiGroup Podcast
 *
 * @apiParamExample {json} Request-Example:
 *     GET /podcast?id=34754fd1-6c41-49bc-8172-f65d8e7dd5fe
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "podcastId": "34754fd1-6c41-49bc-8172-f65d8e7dd5fe",
 *       "name": "The best Podcast in the World",
 *       "description": "But this is just a tribute",
 *       "author": "Jack Green",
 *       "authorUrl": "www.podcastauthor2.com",
 *       "genre": "SCIENCE",
 *       "image": "https://assets.radiox.co.uk/2014/42/tenacious-d---tribute-video-1414069428-list-handheld-0.jpg",
 *       "source": "itunes",
 *       "sourceLink": "itunes.com",
 *       "followTimestamp": 15283420140000,
 *       "lastPlayedTimestamp": 1528642014,
 *     }
 */
router.get('/', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const podcastId = req.param('id');

  PodcastController.GetPodcast(logger, podcastId)
    .then((podcastData) => {
      new Response(res, podcastData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

/**
 * @api {post} /podcast/follow /follow
 * @apiName /podcast/follow
 * @apiDescription Follow the given podcast with the given podcastId.
 * @apiGroup Podcast
 *
 * @apiParamExample {json} Request-Example:
 *     POST /podcast/follow
 *     Headers: [
 *        "x-account-id": 34754fd1-6c41-49bc-8172-f65d8e7dd5fe
 *     ]
 *     {
 *        "podcastId": "c2a145ce-c568-485d-91da-fdeaf2357927"
 *     }
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {}
 */
router.post('/follow', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const accountId = req.get('x-account-id');
  const podcastId = req.body.podcastId;

  PodcastController.FollowPodcast(logger, accountId, podcastId)
    .then((accountData) => {
      new Response(res, accountData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

/**
 * @api {get} /podcast/followed /followed
 * @apiName /podcast/followed
 * @apiDescription Gets the a set of the podcasts a user follows, sorted by relevance to the user.
 * @apiGroup Podcast
 *
 * @apiParam {String} next Optional. Can be set get the next page of results.
 *
 * @apiParamExample {json} Request-Example:
 *     GET /podcast/followed
 *     GET /podcast/followed?next=eyJ0ZXJtIjoicG9kY2FzdCIsImZyb20iOjIwfQ==
 *     Headers: [
 *        "x-account-id": 34754fd1-6c41-49bc-8172-f65d8e7dd5fe
 *     ]
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *        "result": [
 *           {
 *              "podcastId": "c2a145ce-c568-485d-91da-fdeaf2357927",
 *              "name": "The best Podcast in the World",
 *              "description": "But this is just a tribute",
 *              "author": "Jack Green",
 *              "authorUrl": "www.podcastauthor2.com",
 *              "genre": "SCIENCE",
 *              "image": "https://assets.radiox.co.uk/2014/42/tenacious-d---tribute-video-1414069428-list-handheld-0.jpg",
 *              "source": "itunes",
 *              "sourceLink": "itunes.com",
 *              "followTimestamp": 1528342014,
 *              "lastPlayedTimestamp": 1528642014,
 *           }
 *        ],
 *        "nextToken": "eyJ0ZXJtIjoicG9kY2FzdCIsImZyb20iOjIwfQ=="
 *     }
 */
router.get('/followed', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const accountId = req.get('x-account-id');
  const nextToken = req.param('next');

  PodcastController.GetFollowedPodcasts(logger, accountId, nextToken)
    .then((accountData) => {
      new Response(res, accountData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

/**
 * @api {get} /podcast/episodes?podcastId /episodes?podcastId
 * @apiName /podcast/episodes?podcastId
 * @apiDescription Gets the a set of the episodes of a podcast, sorted by release timestamp.
 * @apiGroup Podcast
 *
 * @apiParam {Number} lastReleaseTimestamp Optional. UTC-Timestamp. Can be set to only get episodes released after the timestamp. (to get latest episodes, not cached yet)
 * @apiParam {Number} oldestReleaseTimestamp Optional. UTC-Timestamp. Can be set to only get episodes released before the timestamp. (can be used for pagination)
 *
 * @apiParamExample {json} Request-Example:
 *     GET /podcast/episodes?podcastId=c2a145ce-c568-485d-91da-fdeaf2357927
 *     GET /podcast/episodes?podcastId=c2a145ce-c568-485d-91da-fdeaf2357927?lastReleaseTimestamp=1528639577
 *     GET /podcast/episodes?podcastId=c2a145ce-c568-485d-91da-fdeaf2357927?oldestReleaseTimestamp=1528639577
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *          "episodeId": "c2a145ce-c568-485d-91da-fdeaf23579271528639577",
 *          "podcastId": "c2a145ce-c568-485d-91da-fdeaf2357927",
 *          "name": "The best Episode 2",
 *          "description": "This is just a tribute too",
 *          "releaseTimestamp": 1528639577,
 *          "duration": "01:14:33",
 *          "audioUrl": "https://9to5mac.files.wordpress.com/2018/06/9to5mac-happy-hour-06-08-2018.mp3",
 *          "likedCount": 2448
 *       }
 *    ]
 */
router.get('/episodes', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const accountId = req.param('podcastId');
  const lastReleaseTimestamp = req.param('lastReleaseTimestamp');
  const oldestReleaseTimestamp = req.param('oldestReleaseTimestamp');

  PodcastController.GetEpisodesFromPodcast(logger, accountId, lastReleaseTimestamp, oldestReleaseTimestamp)
    .then((accountData) => {
      new Response(res, accountData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

/**
 * @api {post} /podcast/import /import
 * @apiName /podcast/import
 * @apiDescription Initiates the import process for the given podcast source id's for a given user.
 * @apiGroup Podcast
 *
 * @apiParamExample {json} Request-Example:
 *     POST /podcast/import
 *     {
 *       "podcastSourceIds": [
 *         1054815950,
 *         793067475,
 *   	     360084272
 *       ]
 *     }
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 202 ACCEPTED
 *     {
 *       "existingPodcasts": [],
 *       "podcastImports": [
 *         "dba6e4d2-cf45-4710-8ff8-ff252d5aa856",
 *         "ca359a98-210d-41dd-839e-2b0a20f034a9",
 *         "af4de685-49ca-4555-9658-6620a3ba664f"
 *       ]
 *     }
 */
router.post('/import', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const accountId = req.get('x-account-id');
  const podcastSourceIds = req.body.podcastSourceIds;

  PodcastController.StartPodcastImportForAccount(logger, accountId, podcastSourceIds)
    .then((accountData) => {
      new Response(res, accountData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

/**
 * @api {post} /podcast/import/raw /import/raw
 * @apiName /podcast/import/raw
 * @apiDescription Initiates the raw import process for the given podcast source id's without a required account id.
 * @apiGroup Podcast
 *
 * @apiParamExample {json} Request-Example:
 *     POST /podcast/import/raw
 *     {
 *       "podcastSourceIds": [
 *         1054815950,
 *         793067475,
 *   	     360084272
 *       ]
 *     }
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 202 ACCEPTED
 *     {
 *       "existingPodcasts": [],
 *       "podcastImports": [
 *         "dba6e4d2-cf45-4710-8ff8-ff252d5aa856",
 *         "ca359a98-210d-41dd-839e-2b0a20f034a9",
 *         "af4de685-49ca-4555-9658-6620a3ba664f"
 *       ]
 *     }
 */
router.post('/import/raw', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const importSecret = req.get('x-import-secret');
  const podcastSourceIds = req.body.podcastSourceIds;

  PodcastController.StartRawPodcastImport(logger, importSecret, podcastSourceIds)
    .then((accountData) => {
      new Response(res, accountData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

/**
 * @api {post} /podcast/import/episodes /import/episodes
 * @apiName /podcast/import/episodes
 * @apiDescription Initiates the import process for the given episode database entries recieved from a lambda podcast import task.
 * @apiGroup Podcast
 *
 * @apiParamExample {json} Request-Example:
 *     POST /podcast/import/episodes
 *     [
 *       {
 *         AUDURL:"https://rss.art19.com/episodes/c6e40d3e-4046-4aed-8e28-36d8979ee983.mp3"
 *         DESC:"H4sIAAAAAAAACk1Ry47UQAy8I/EP5j4gJFYcODEIdlktixDsBW6ejpOY7baHfhDC1/AtfBnVGa0G5dBdrnKVnb42qrMWkqMWH2RHi1ASqcQxUtFf5CN5y3TQ4Fwqo/ij8dDLwWcvtVB1GrSEVnCdhfZWZ7eVbsRMhpWyVM2SxOBp5s3CBnbEBWFIwRn0p0atKxSwhkum8HTxPJRnf//czWK7zfoU/b0NkxRSKwqvLHRsh6iB+OjRJwW1uYyj5IL04Al5A1d1KzQ6rN2xRm3jSIuDI4bJ4GrT1pn4HlcEP3708F2iKzlUY/a0jfJ+LVWyMm3/YAffGH3pVCI3ulu0gn9ytniX1ejzyljlNawMEVN0OJwlH7/Sl77hqw7eRNZM14lN0XHoSDvo3D6upTDd4kEwjxsHh+ZUPRUvLrrum+I1L1tqg88Q/AY8p33Y/5d2o5mN3opH6MqstS9634udvZUJ7BVrlLWP3+G0oc5eZQ5CnzhnBrmhDbx4+fwfme1z0F4CAAA="
 *         DRTN:4501
 *         LKD:0
 *         NAME:"Courts, Civility, and other C words"
 *         PID:"bb4db974-b94a-42c6-844b-6ca7d3da1de3"
 *         RLSTS:1530220183
 *       }
 *     ]
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {}
 */
router.post('/import/episodes', function(req: express.Request, res: express.Response, next: NextFunction) {
  const logger = new AppLogger(req, res);
  const podcastId = req.get('x-podcast-id');
  const taskToken = req.get('x-task-token');
  const updateToken = req.get('x-update-token');
  const episodeDatabaseEntries = req.body;

  PodcastController.StartEpisodeImport(logger, podcastId, taskToken, updateToken, episodeDatabaseEntries)
    .then((accountData) => {
      new Response(res, accountData).Send();
    })
    .catch((error) => {
      new Response(res, null, error).Send();
    });
});

module.exports = router;
