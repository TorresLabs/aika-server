import { NextFunction } from 'express';

import express = require('express');
const router = express.Router();

/**
 * @api {get} /apple-app-site-association /
 * @apiName /apple-app-site-association
 * @apiDescription Response with the apple-app-site-association file needed for universal links.
 * @apiGroup AASA
 *
 * @apiParamExample {json} Request-Example:
 *     GET /apple-app-site-association
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *
 */
router.get('/', function(req: express.Request, res: express.Response, next: NextFunction) {
  const appleAppSiteAssociationObject = {
    applinks: {
      apps: [],
      details: [
        {
          appID: '3VP8F3G78N.com.tinkrinc.aika',
          paths: [
            '/app',
            '/app/twitter/auth'
          ]
        }
      ]
    }
  };

  res.send(appleAppSiteAssociationObject);
});

module.exports = router;
