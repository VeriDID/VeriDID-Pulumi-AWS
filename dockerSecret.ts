import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";


// Load the GitHub token from Pulumi config
let config = new pulumi.Config();
let githubToken = config.requireSecret("githubToken");
let dockerRegistryUsername = config.require("dockerRegistryUsername"); // assuming you set a username as well

// Create Docker registry credentials config file
let dockerConfigFile = {
    "auths": {
        "ghcr.io": {
            "username": dockerRegistryUsername,
            "password": githubToken,
            "auth": pulumi.all([dockerRegistryUsername, githubToken]).apply(([username, token]) => Buffer.from(`${username}:${token}`).toString("base64")),
        }
    }
}

// Create a Secret
export const createDockerSecret = (namespace: string, provider: k8s.Provider) => new k8s.core.v1.Secret("ghcr-secret", {
    metadata: {
        name: "ghcr-secret",
        namespace: namespace,
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
        ".dockerconfigjson": dockerConfigFile.apply(JSON.stringify),
    },
}, { provider: provider });
