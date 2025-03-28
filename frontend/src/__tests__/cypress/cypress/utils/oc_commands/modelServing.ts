/* eslint-disable cypress/no-unnecessary-waiting */
import { createDataConnection } from '~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';
import type { DataConnectionReplacements } from '~/__tests__/cypress/cypress/types';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';

/**
 * Provision (using oc) a Project in order to make it usable with model seving
 * (creates a Data Connection also)
 *
 * @param projectName Project Name
 * @param bucketKey AWS Bucket
 * @param customDataConnectionYamlPath DC Yaml Value
 */
export const provisionProjectForModelServing = (
  projectName: string,
  bucketKey: 'BUCKET_1' | 'BUCKET_3',
  customDataConnectionYamlPath?: string,
): void => {
  cy.log(`Provisioning project with bucket key: ${bucketKey}`);

  const bucketConfig = AWS_BUCKETS[bucketKey];

  // Provision a Project
  createCleanProject(projectName);

  // Create a pipeline-compatible Data Connection
  const dataConnectionReplacements: DataConnectionReplacements = {
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_DEFAULT_REGION: Buffer.from(bucketConfig.REGION).toString('base64'),
    AWS_S3_BUCKET: Buffer.from(bucketConfig.NAME).toString('base64'),
    AWS_S3_ENDPOINT: Buffer.from(bucketConfig.ENDPOINT).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDataConnection(dataConnectionReplacements, customDataConnectionYamlPath);
};

/**
 * Type for InferenceService Condition
 */
type InferenceServiceCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  severity?: string;
};

/**
 * Type for InferenceService State
 */
type InferenceServiceState = {
  status?: {
    conditions?: InferenceServiceCondition[];
    modelStatus?: {
      states?: {
        activeModelState?: string;
      };
    };
  };
};

/**
 * Type for Condition Check
 */
type ConditionCheck = {
  type: string;
  expectedStatus: string;
  check: (condition: InferenceServiceCondition) => boolean;
  name: string;
};

/**
 * Safely get a string value, defaulting to an empty string
 */
const safeString = (value: string | undefined | null): string => value ?? '';

/**
 * Check InferenceService active model state and additional conditions
 *
 * @param serviceName InferenceService name
 * @returns Result Object of the operation
 */
export const checkInferenceServiceState = (
  serviceName: string,
): Cypress.Chainable<Cypress.Exec> => {
  const ocCommand = `oc get inferenceService ${serviceName} -o json`;
  const maxAttempts = 96; // 8 minutes / 5 seconds = 96 attempts
  let attempts = 0;

  const checkState = (): Cypress.Chainable<Cypress.Exec> => {
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;

      let serviceState: InferenceServiceState;
      try {
        serviceState = JSON.parse(result.stdout) as InferenceServiceState;
      } catch (error) {
        cy.log(
          `❌ Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw new Error(
          `Failed to parse InferenceService JSON: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      // Check active model state
      const activeModelState =
        serviceState.status?.modelStatus?.states?.activeModelState || 'EMPTY';
      const conditions = serviceState.status?.conditions || [];

      // Detailed initial logging
      cy.log(`🧐 Attempt ${attempts}: Checking InferenceService state
        Service Name: ${serviceName}
        Active Model State: ${activeModelState}
        Total Conditions: ${conditions.length}`);

      // Prepare condition checks with logging
      const conditionChecks: ConditionCheck[] = [
        {
          type: 'LatestDeploymentReady',
          expectedStatus: 'True',
          check: (condition) =>
            condition.type === 'LatestDeploymentReady' && condition.status === 'True',
          name: 'Latest Deployment Ready',
        },
        {
          type: 'Ready',
          expectedStatus: 'True',
          check: (condition) => condition.type === 'Ready' && condition.status === 'True',
          name: 'Service Ready',
        },
      ];

      // Perform condition checks with detailed logging
      const checkedConditions = conditionChecks.map((condCheck) => {
        const foundCondition = conditions.find((condition) => condition.type === condCheck.type);

        const isPassed = foundCondition ? condCheck.check(foundCondition) : false;

        // Detailed condition logging
        cy.log(`🔍 Condition Check: ${condCheck.name}
          Type: ${condCheck.type}
          Expected Status: ${condCheck.expectedStatus}
          Found Condition: ${foundCondition ? 'Yes' : 'No'}
          Status: ${safeString(foundCondition?.status)}
          Reason: ${safeString(foundCondition?.reason)}
          Passed: ${isPassed ? '✅' : '❌'}`);

        return {
          ...condCheck,
          foundCondition,
          isPassed,
        };
      });

      // Check if active model state is "Loaded"
      const isModelLoaded = activeModelState === 'Loaded';
      cy.log(`Active Model State Check: ${isModelLoaded ? '✅ Loaded' : '❌ Not Loaded'}`);

      // Determine overall success
      const allConditionsPassed = checkedConditions.every((check) => check.isPassed);

      if (isModelLoaded && allConditionsPassed) {
        cy.log(
          `✅ InferenceService ${serviceName} is in "Loaded" state and meets all conditions after ${attempts} attempts`,
        );
        return cy.wrap(result);
      }

      if (attempts >= maxAttempts) {
        // Prepare detailed error message with full condition details
        const conditionDetails = conditions
          .map(
            (condition) =>
              `Type: ${safeString(condition.type)}, Status: ${safeString(
                condition.status,
              )}, Reason: ${safeString(condition.reason)}, Message: ${safeString(
                condition.message,
              )}`,
          )
          .join('\n');

        const errorMessage = `❌ InferenceService ${serviceName} did not meet all conditions within 8 minutes
          Active Model State: ${activeModelState}
          Condition Checks:
          ${checkedConditions
            .map(
              (check) =>
                `${check.name}: ${check.isPassed ? '✅' : '❌'} (Status: ${safeString(
                  check.foundCondition?.status,
                )})`,
            )
            .join('\n')}
          
          Full Condition Details:
          ${conditionDetails}`;

        cy.log(errorMessage);
        throw new Error(errorMessage);
      } else {
        return cy.wait(5000).then(() => checkState());
      }
    });
  };

  return checkState();
};

/**
 * Extracts the external URL of a model from its InferenceService and performs a test request.
 *
 * @param modelName - The name of the InferenceService/model to test.
 */
export const modelExternalURLOpenVinoTester = (
  modelName: string,
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
  return cy.exec(`oc get inferenceService ${modelName} -o json`).then((result) => {
    const inferenceService = JSON.parse(result.stdout);
    const { url } = inferenceService.status;

    if (!url) {
      throw new Error('External URL not found in InferenceService');
    }

    cy.log(`Request URL: ${url}/v2/models/${modelName}/infer`);
    cy.log(`Request method: POST`);
    cy.log(`Request headers: ${JSON.stringify({ 'Content-Type': 'application/json' })}`);
    cy.log(
      `Request body: ${JSON.stringify({
        inputs: [
          {
            name: 'Func/StatefulPartitionedCall/input/_0:0',
            shape: [1, 30],
            datatype: 'FP32',
            data: Array.from({ length: 30 }, (_, i) => i + 1),
          },
        ],
      })}`,
    );

    return cy
      .request({
        method: 'POST',
        url: `${url}/v2/models/${modelName}/infer`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          inputs: [
            {
              name: 'Func/StatefulPartitionedCall/input/_0:0',
              shape: [1, 30],
              datatype: 'FP32',
              data: Array.from({ length: 30 }, (_, i) => i + 1),
            },
          ],
        },
        failOnStatusCode: false,
      })
      .then((response) => {
        cy.log(`Response status: ${response.status}`);
        cy.log(`Response body: ${JSON.stringify(response.body)}`);

        // Return a Cypress chain instead of a plain object
        return cy.wrap({ url, response });
      });
  });
};

/**
 * Validates tolerations in a workbench pod
 *
 * @param namespace The namespace where the workbench pod is running
 * @param modelName The prefix or partial name of the Model pod
 * @param expectedToleration The toleration to check for, or null if no toleration is expected
 * @param expectPodRunning Whether the pod is expected to be running
 * @returns Cypress.Chainable<string> that resolves to the result of the validation or pod name
 */
/**
 * Validates tolerations in an InferenceService resource.
 *
 * @param namespace The namespace where the InferenceService is deployed.
 * @param inferenceServiceName The name of the InferenceService resource.
 * @param expectedToleration The toleration object to check for, or null if no toleration is expected.
 * @returns Cypress.Chainable<void> that resolves after validation.
 */
export const validateInferenceServiceTolerations = (
  namespace: string,
  inferenceServiceName: string,
  expectedToleration: { key: string; operator: string; effect: string } | null,
): Cypress.Chainable<Cypress.Exec> => {
  // Construct the `oc` command to retrieve the InferenceService JSON
  const getInferenceServiceCmd = `oc get inferenceService ${inferenceServiceName} -n ${namespace} -o json`;

  // Log the command being executed for debugging purposes
  cy.log(`Executing command: ${getInferenceServiceCmd}`);

  return cy.exec(getInferenceServiceCmd, { failOnNonZeroExit: false }).then((result) => {
    // Handle command failure
    if (result.code !== 0) {
      const errorMsg = result.stderr.includes('NotFound')
        ? `InferenceService "${inferenceServiceName}" not found in namespace "${namespace}".`
        : `Command failed: ${result.stderr}`;
      cy.log(`❌ Error executing command:\n${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Parse JSON output to extract tolerations
    const inferenceService = JSON.parse(result.stdout);
    const tolerations = inferenceService.spec.predictor.tolerations || [];
    cy.log(`Found tolerations: ${JSON.stringify(tolerations)}`);

    if (expectedToleration) {
      // Validate that the expected toleration exists in the list
      const exists = tolerations.some(
        (t: { key: string; operator: string; effect: string }) =>
          t.key === expectedToleration.key &&
          t.operator === expectedToleration.operator &&
          t.effect === expectedToleration.effect,
      );

      if (!exists) {
        throw new Error(
          `Expected toleration ${JSON.stringify(
            expectedToleration,
          )} not found in InferenceService "${inferenceServiceName}".\n` +
            `Found tolerations: ${JSON.stringify(tolerations)}`,
        );
      }

      cy.log(
        `✅ Verified expected toleration exists in InferenceService "${inferenceServiceName}".`,
      );
    } else {
      // Validate that no tolerations exist
      if (tolerations.length > 0) {
        throw new Error(
          `Unexpected tolerations found in InferenceService "${inferenceServiceName}":\n${JSON.stringify(
            tolerations,
          )}`,
        );
      }

      cy.log(`✅ No tolerations found as expected in InferenceService "${inferenceServiceName}".`);
    }
  });
};
