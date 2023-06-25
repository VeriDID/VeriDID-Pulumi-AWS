import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const awsRegion = config.requireSecret("AWS_REGION");
const cognitoUserPoolId = config.requireSecret("AWS_COGNITO_USER_POOL_ID");
const cognitoClientId = config.requireSecret("AWS_COGNITO_CLIENT_ID");

export const createCognitoSecret = (
  namespace: string,
  provider: k8s.Provider,
  opts?: pulumi.CustomResourceOptions,
): k8s.core.v1.Secret =>
  new k8s.core.v1.Secret("cognito-secret", {
    metadata: {
      name: "cognito-secret",
      namespace: namespace,
    },
    stringData: {
      "AWS_REGION": awsRegion,
      "AWS_COGNITO_USER_POOL_ID": cognitoUserPoolId,
      "AWS_COGNITO_CLIENT_ID": cognitoClientId,
    },
    // stringData: {
    //   "cognito-region": awsRegion,
    //   "cognito-user-pool-id": cognitoUserPoolId,
    //   "cognito-client-id": cognitoClientId,
    // },
  },
    { provider: provider, ...opts }
  );
