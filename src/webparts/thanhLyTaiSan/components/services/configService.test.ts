jest.mock('@microsoft/sp-http', () => ({
  SPHttpClient: {
    configurations: {
      v1: {}
    }
  }
}));

import type { SPHttpClient } from '@microsoft/sp-http';
import { getStopSellingConfig, invalidateConfigCache, isUserBlacklisted, isUserInBlacklistValue } from './configService';
import * as sharePointListUtils from './sharePointListUtils';

describe('configService.getStopSellingConfig', () => {
  const siteUrl: string = 'https://contoso.sharepoint.com/sites/assets';
  const spHttpClient = ({} as unknown) as SPHttpClient;

  afterEach(() => {
    invalidateConfigCache(siteUrl);
    jest.restoreAllMocks();
  });

  it('returns true when StopSelling Value is true', async () => {
    jest.spyOn(sharePointListUtils, 'getListItems').mockResolvedValue([
      {
        Title: 'StopSelling',
        Value: 'true'
      }
    ]);

    await expect(getStopSellingConfig(siteUrl, spHttpClient)).resolves.toBe(true);
  });

  it('returns false when StopSelling config is missing', async () => {
    jest.spyOn(sharePointListUtils, 'getListItems').mockResolvedValue([]);

    await expect(getStopSellingConfig(siteUrl, spHttpClient)).resolves.toBe(false);
  });

  it('returns false when StopSelling Value is false', async () => {
    jest.spyOn(sharePointListUtils, 'getListItems').mockResolvedValue([
      {
        Title: 'StopSelling',
        Value: 'false'
      }
    ]);

    await expect(getStopSellingConfig(siteUrl, spHttpClient)).resolves.toBe(false);
  });
});

describe('configService.isUserInBlacklistValue', () => {
  it('returns true when user email is contained in blacklist string', () => {
    expect(isUserInBlacklistValue('a@x.com;b@x.com', 'a@x.com')).toBe(true);
    expect(isUserInBlacklistValue('a@x.com;b@x.com', 'b@x.com')).toBe(true);
  });

  it('returns false when user email is not in blacklist string', () => {
    expect(isUserInBlacklistValue('a@x.com;b@x.com', 'c@x.com')).toBe(false);
  });

  it('returns false when blacklist value is empty or undefined', () => {
    expect(isUserInBlacklistValue(undefined, 'a@x.com')).toBe(false);
    expect(isUserInBlacklistValue('', 'a@x.com')).toBe(false);
  });

  it('returns false when user email is empty', () => {
    expect(isUserInBlacklistValue('a@x.com;b@x.com', '')).toBe(false);
    expect(isUserInBlacklistValue('a@x.com;b@x.com', '   ')).toBe(false);
  });
});

describe('configService.isUserBlacklisted', () => {
  const siteUrl: string = 'https://contoso.sharepoint.com/sites/assets';
  const spHttpClient = ({} as unknown) as SPHttpClient;

  afterEach(() => {
    invalidateConfigCache(siteUrl);
    jest.restoreAllMocks();
  });

  it('returns true when BlackListUser config contains user email', async () => {
    jest.spyOn(sharePointListUtils, 'getListItems').mockResolvedValue([
      {
        Title: 'BlackListUser',
        Value: 'blocked@mag.com.vn;other@mag.com.vn'
      }
    ]);

    await expect(isUserBlacklisted(siteUrl, spHttpClient, 'blocked@mag.com.vn')).resolves.toBe(true);
  });

  it('returns false when BlackListUser config is missing', async () => {
    jest.spyOn(sharePointListUtils, 'getListItems').mockResolvedValue([]);

    await expect(isUserBlacklisted(siteUrl, spHttpClient, 'user@mag.com.vn')).resolves.toBe(false);
  });
});
