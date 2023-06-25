import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
//import { config } from 'dotenv';
import * as fs from 'fs';
import { clusterName, vpcId, clusterOidcProvider, clusterOidcProviderArn } from '../index'

// Function setupAwsLoadBalancerController is used to create and setup an AWS Load Balancer Controller on a provided Amazon EKS cluster.
// This function will create an IAM Role with necessary permissions, a Kubernetes namespace and service account.
// Finally, it will deploy the AWS Load Balancer Controller using a Helm Chart.
//config();
const config = new pulumi.Config();

export function setupAwsLoadBalancerController(k8sProvider: k8s.Provider) {
    const namespaceName = "kube-system";
    const serviceAccountName = `system:serviceaccount:${namespaceName}:lb-aws-load-balancer-controller`;
    const region = config.requireSecret("AWS_REGION")|| 'ca-central-1';

    if (!clusterOidcProvider || !clusterOidcProviderArn) {
        throw new Error("Cluster OIDC provider information not available.");
    }

    const albRole = new aws.iam.Role("aws-loadbalancer-controller-role", {
        assumeRolePolicy: pulumi.all([clusterOidcProviderArn, clusterOidcProvider]).apply(([oidcArn, oidcUrl]) => JSON.stringify({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Federated": oidcArn,
                    },
                    "Action": "sts:AssumeRoleWithWebIdentity",
                    "Condition": {
                        "StringEquals": {
                            [`${oidcUrl}:sub`]: serviceAccountName,
                            [`${oidcUrl}:aud`]: "sts.amazonaws.com"
                        },
                    },
                }
            ],
        })),
    });


    let policyDoc;
    try {
        policyDoc = fs.readFileSync("./files/awsLoadBalancerController_policy.json", "utf-8");
    } catch (error) {
        console.error('Error reading policy file', error);
        throw error;
    }

    const albPolicy = new aws.iam.Policy("aws-loadbalancer-controller-policy", {
        policy: policyDoc,
    }, { parent: albRole });

    // Attach IAM policy to the created IAM role.
    const loadBalancerControllerPolicyAttachment = new aws.iam.RolePolicyAttachment("awsLoadbalancerControllerAttachment", {
        policyArn: albPolicy.arn,
        role: albRole.name,
    }, { parent: albRole });

    const chart = new k8s.helm.v3.Chart("lb", {
        chart: "aws-load-balancer-controller",
        // Balancer-controller",
        fetchOpts: {
            repo: "https://aws.github.io/eks-charts"
        },
        namespace: namespaceName,
        values: {

            region: region,
            serviceAccount: {
                create: true,
                annotations: {
                    "eks.amazonaws.com/role-arn":
                        albRole.arn,
                },
            },
            vpcId: vpcId,
            clusterName: clusterName,
            podLabels: {
                stack: pulumi.getStack(),
                app: namespaceName
            },
        },
    }, { provider: k8sProvider });
    return chart;
}