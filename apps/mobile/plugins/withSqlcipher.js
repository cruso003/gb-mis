/**
 * Expo config plugin: wire SQLCipher into the Android build.
 *
 * Runs during `expo prebuild` and:
 *   1. Adds the net.zetetic SQLCipher Android dependency to app/build.gradle
 *   2. Adds a USE_SQLCIPHER buildConfig field so the WatermelonDB native
 *      module knows to open the database with PRAGMA key on connect
 *   3. Adds a gradle property (gbmis.useSqlcipher=true) that the
 *      WatermelonDB native module reads at compile time
 *
 * The actual WatermelonDB → SQLCipher native binding (linking
 * libsqlcipher.so instead of the system SQLite) is documented in
 * MOBILE_SQLCIPHER_BUILD.md and must be applied as part of the prebuild
 * verification step on the Android build host.
 *
 * iOS is intentionally not wired — Phase 1 ships Android only per
 * ROADMAP.md. The plugin is a no-op on iOS.
 */

const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const SQLCIPHER_VERSION = '4.6.1';
const GRADLE_DEP = `    implementation 'net.zetetic:android-database-sqlcipher:${SQLCIPHER_VERSION}'`;
const BUILD_CONFIG_FIELD = '        buildConfigField "boolean", "USE_SQLCIPHER", "true"';

function injectAppBuildGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes('android-database-sqlcipher')) {
      contents = contents.replace(/dependencies\s*\{/, (match) => `${match}\n${GRADLE_DEP}`);
    }

    if (!contents.includes('USE_SQLCIPHER')) {
      contents = contents.replace(
        /defaultConfig\s*\{/,
        (match) => `${match}\n${BUILD_CONFIG_FIELD}`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function injectGradleProperty(config) {
  return withGradleProperties(config, (cfg) => {
    const exists = cfg.modResults.some(
      (item) => item.type === 'property' && item.key === 'gbmis.useSqlcipher',
    );
    if (!exists) {
      cfg.modResults.push({ type: 'property', key: 'gbmis.useSqlcipher', value: 'true' });
    }
    return cfg;
  });
}

module.exports = function withSqlcipher(config) {
  config = injectAppBuildGradle(config);
  config = injectGradleProperty(config);
  return config;
};
