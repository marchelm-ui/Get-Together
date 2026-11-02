import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { ADMOB_BANNER_ANDROID, ADMOB_BANNER_IOS } from '../lib/config';

/**
 * Bottom banner ad. Safe everywhere:
 * - In Expo Go the native ads module doesn't exist, so this renders nothing.
 * - In a development/production build it shows a Google AdMob adaptive banner.
 * Until you paste your real AdMob unit IDs into config.ts, Google's official TEST ids are used
 * (required by AdMob policy while developing — real ids during testing can get the account banned).
 */
let ads: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null;
}

let initialized = false;
export function initAds() {
  if (!ads || initialized) return;
  initialized = true;
  try { ads.default().initialize().catch(() => {}); } catch {}
}

export function AdBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => { initAds(); setReady(true); }, []);
  if (!ads || !ready) return null;
  const { BannerAd, BannerAdSize, TestIds } = ads;
  const configured = Platform.OS === 'ios' ? ADMOB_BANNER_IOS : ADMOB_BANNER_ANDROID;
  const unitId = __DEV__ || !configured ? TestIds.ADAPTIVE_BANNER : configured;
  return (
    <View style={{ alignItems: 'center', backgroundColor: '#f6f7fb' }}>
      <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
    </View>
  );
}
