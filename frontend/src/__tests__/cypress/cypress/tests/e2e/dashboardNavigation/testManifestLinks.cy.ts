import * as yaml from 'js-yaml';
import { isUrlExcluded } from '~/__tests__/cypress/cypress/utils/urlExtractor';

describe('Verify that all the URLs referenced in the Manifest directory are operational', () => {
  let excludedSubstrings: string[];
  const validStatusCodes = new Set([200, 201, 202, 204, 301, 302, 307, 308, 429]);

  // Setup: Load test data
  before(() => {
    cy.fixture('e2e/dashboardNavigation/testManifestLinks.yaml', 'utf8').then((yamlString) => {
      const yamlData = yaml.load(yamlString) as { excludedSubstrings: string[] };
      excludedSubstrings = yamlData.excludedSubstrings;
    });
  });

  it(
    'Reads the manifest directory, filters out test/sample URLs and validates the remaining URLs',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-327', '@ODS-492', '@Dashboard', '@RHOAIENG-9235'] },
    () => {
      const manifestsDir = '../../../../manifests';
      cy.log(`Resolved manifests directory: ${manifestsDir}`);

      // Extract URLs from the manifests directory using the registered task
      cy.task<string[]>('extractHttpsUrls', manifestsDir).then((urls) => {
        // Filter out Sample/Test URLs
        const filteredUrls = urls.filter((url) => !isUrlExcluded(url, excludedSubstrings));

        // Log filtered URLs for debugging
        filteredUrls.forEach((url) => {
          cy.log(`[PRE-CHECK UI LOG] URL to check: ${url}`);
        });

        // Verify that each remaining URL is accessible and returns a 200 status code
        cy.task(
          'log',
          `[Step] Verify that each filtered URL is accessible and returns one of the valid status codes: ${Array.from(
            validStatusCodes,
          ).join(', ')}`,
          { log: false },
        );

        // Call the Node.js task to check all URLs concurrently
        const checkUrls = (urlsToCheck: string[], retryCount = 0) => {
          cy.task<{ url: string; status: number; error?: string }[]>(
            'validateHttpsUrls',
            urlsToCheck,
          ).then((results) => {
            // Filter URLs that need retry (429 status)
            const urlsToRetry = results
              .filter(({ status }) => status === 429)
              .map(({ url }) => url);

            // If we have URLs to retry and haven't exceeded max retries
            if (urlsToRetry.length > 0 && retryCount < 3) {
              cy.log(
                `⚠️ Rate limited (429) for ${
                  urlsToRetry.length
                } URLs, waiting 3 seconds before retry ${retryCount + 1}/3`,
              );
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(3000).then(() => {
                checkUrls(urlsToRetry, retryCount + 1);
              });
            }

            // Process all results
            results.forEach(({ url, status, error }) => {
              const isValid = validStatusCodes.has(status);
              let logMessageSegment = '';

              if (isValid) {
                logMessageSegment = `✅ ${url} - Status: ${status}`;
              } else {
                switch (status) {
                  case -1:
                    logMessageSegment = `TIMEOUT ❌ ${url} - Error Code: ${status}`;
                    break;
                  case -2:
                    logMessageSegment = `REDIRECT_MAX ❌ ${url} - Error Code: ${status}`;
                    break;
                  case -3:
                    logMessageSegment = `REDIRECT_INVALID ❌ ${url} - Error Code: ${status}`;
                    break;
                  case -4:
                    logMessageSegment = `ABORTED ❌ ${url} - Error Code: ${status}`;
                    break;
                  case -5:
                    logMessageSegment = `NETWORK_ERROR ❌ ${url} - Error Code: ${status}`;
                    break;
                  default:
                    logMessageSegment = `❌ ${url} - Status: ${status} (Expected one of: ${Array.from(
                      validStatusCodes,
                    ).join(', ')})`;
                }
                if (error) {
                  logMessageSegment += ` (Details: ${error})`;
                }
              }

              cy.step(logMessageSegment);
            });
          });
        };

        // Start checking URLs
        checkUrls(filteredUrls);
      });
    },
  );
});
