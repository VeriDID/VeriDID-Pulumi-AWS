import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { createDockerSecret } from "./dockerSecret";
import { createCognitoSecret } from "./cognitoSecret";
import { configArgoCD } from "../config/configArgoCD";
import { setupAwsLoadBalancerController } from "../components/awsLoadBalancerController";

export function setupArgoCD(k8sProvider: k8s.Provider) {
    // Create a Kubernetes namespace for ArgoCD
    const argocdNamespace = new k8s.core.v1.Namespace("argocd", {
        metadata: {
            name: "argocd",
        },
    }, { provider: k8sProvider });

    // Deploy ArgoCD via its Helm chart
    const argocdChart = new k8s.helm.v3.Chart("argocd", {
        chart: "argo-cd",
        fetchOpts: {
            repo: "https://argoproj.github.io/argo-helm",
        },
        version: "3.9.0",
        namespace: argocdNamespace.metadata.name,
    //}, { provider: k8sProvider, ...opts });
}, { provider: k8sProvider });

    // Create a new namespace for our test application
    const namespace = new k8s.core.v1.Namespace("afj-test-app", { metadata: { name: "afj-test-app" } }, {
        provider: k8sProvider,
        customTimeouts: {
            delete: "10m",
        },
    });

    // Create a Docker secret for the test application
    const dockerSecret = createDockerSecret("afj-test-app", k8sProvider, { dependsOn: namespace });

    // Create a Cognito secret for the test application
    const cognitoSecret = createCognitoSecret("afj-test-app", k8sProvider, { dependsOn: namespace });

    // Create a custom resource for ArgoCD app configuration, depending on the ArgoCD Helm chart and the Docker and Cognito secrets
    const argocdApp = new k8s.apiextensions.CustomResource("afj-test-pulumi-k8s-config", configArgoCD, { provider: k8sProvider, dependsOn: [argocdChart, dockerSecret, cognitoSecret] });

    // Return all the created resources
    return { argocdNamespace, argocdChart, namespace, dockerSecret, cognitoSecret, argocdApp };

    // // Return all the created resources
    // return { argocdNamespace };
}
