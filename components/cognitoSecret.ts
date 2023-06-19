import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const cognitoUserPoolId = config.requireSecret("cognitoUserPoolId");
const cognitoClientId = config.requireSecret("cognitoClientId");
const cognitoRegion = config.requireSecret("cognitoRegion");

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
      "cognito-user-pool-id": cognitoUserPoolId,
      "cognito-client-id": cognitoClientId,
      "cognito-region": cognitoRegion,
    },
  },
  { provider: provider, ...opts }
);
