import pkg from '../../package.json';
import productionManifest from '../../data/production-manifest.json';

export const snapshotMetadata = Object.freeze({
  packageVersion: pkg.version,
  dataVersion: productionManifest.dataVersion,
  generatedAt: productionManifest.generatedAt,
  digestAlgorithm: productionManifest.digestAlgorithm,
  digest: productionManifest.digest,
  coverageUrl: 'https://countrystatecity.tansuasici.com/docs/data-coverage',
});
