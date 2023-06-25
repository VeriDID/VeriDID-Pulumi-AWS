import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Load the GitHub token from Pulumi config
const config = new pulumi.Config();
const githubToken = config.requireSecret("githubToken");
const dockerRegistryUsername = config.require("dockerRegistryUsername"); 

// Create Docker registry credentials config file
const dockerConfigFile = pulumi
  .all([dockerRegistryUsername, githubToken])
  .apply(([username, token]) => ({
    auths: {
      "ghcr.io": {
        username: username,
        password: token,
        auth: Buffer.from(`${username}:${token}`).toString("base64"),
      },
    },
  }));

// Create a Secret
export const createDockerSecret = (
  namespace: string,
  provider: k8s.Provider,
  opts?: pulumi.CustomResourceOptions,
): k8s.core.v1.Secret =>
  new k8s.core.v1.Secret("ghcr-secret", {
    metadata: {
      name: "ghcr-secret",
      namespace: namespace,
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
      ".dockerconfigjson": dockerConfigFile.apply(JSON.stringify),
    },
  },
  { provider: provider, ...opts }
);
