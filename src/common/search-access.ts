import elasticsearch = require('elasticsearch');
import { EnvironmentHelper } from '../utility/environment-helper';
import { Environment } from '../utility/environment';
import to from '../utility/to';
import { AppLogger } from '../logging/app-logger';

export class SearchAccess {
  private static client: elasticsearch.Client;

  public static async Init(logger: AppLogger) {
    const config = SearchAccess.GetConfig();
    logger.Info('Connecting to search service host: ' + config.host);

    SearchAccess.client = new elasticsearch.Client(config);

    const pingAsyncResult = await to(SearchAccess.client.ping({requestTimeout: 1000}));

    if (pingAsyncResult.error) {
      throw pingAsyncResult.error;
    }

    logger.Info('Connected to search service');
  }

  private static GetConfig() {
    let config: elasticsearch.ConfigOptions = null;

    switch (EnvironmentHelper.GetEnvironment()) {
    case Environment.LIVE:
      config = {
        host: 'https://vpc-aika-live-app-search-jvrfihnuaf7ini37dm2slubavm.us-east-1.es.amazonaws.com',
        log: 'error',
        connectionClass: require('http-aws-es')
      };
      break;
    case Environment.DEV:
      config = {
        host: 'https://vpc-aika-dev-app-search-ppjmsnw3dv6li3nzbiytzajfjy.eu-west-1.es.amazonaws.com',
        log: 'error',
        connectionClass: require('http-aws-es')
      };
      break;
    case Environment.LOCAL:
      config = {
        host: 'localhost:9200',
        log: 'trace'
      };
      break;
    }

    return config;
  }

  public static async Search(logger: AppLogger, index: string, body: any) {
    logger.Info('Searching for: ' + JSON.stringify(body) + ' in index: ' + index);

    const searchAsyncResult = await to(SearchAccess.client.search({
      index,
      body
    }));

    if (searchAsyncResult.error) {
      throw searchAsyncResult.error;
    }

    const result = searchAsyncResult.result;

    logger.Info('Searched for: ' + JSON.stringify(body) + ' in index: ' + index +
      ' successful! Found ' + result.hits.total + ' results.');

    return result.hits.hits;
  }
}
