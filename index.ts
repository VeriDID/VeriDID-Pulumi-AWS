import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

/***************************************************EKS CLUSTER***********************************************************************/
/*EKS Cluster Setup:
    - Imports required libraries (Pulumi, AWS, AWSX, EKS, Kubernetes).
    - Defines the name of the cluster and some related configuration.
    - Creates a Virtual Private Cloud (VPC) with 2 availability zones and a specific CIDR block.
    - Creates two IAM roles, one for the EKS cluster and one for the worker nodes.
    - Attaches necessary policies to these roles, allowing the cluster and nodes to function correctly.
    - Creates an EKS cluster in the VPC. The cluster uses "t2.medium" EC2 instances, with a minimum of 1 and a maximum of 2 instances. Also, it creates an OIDC provider and assigns the workerNodeRole to the instances.
*/

const name = 'veridid';
const clusName = `${name}-cluster`;
const clusterTag = `kubernetes.io/cluster/${clusName}`;

// This defines a valid VPC that can be used for EKS
const vpc = new awsx.ec2.Vpc(`vpc-${name}`, {
    numberOfAvailabilityZones: 2, // Use only two AZs
    cidrBlock: "172.16.0.0/24",
    tags: {
        Name: `${name}-vpc`,
    }
});

// Create an IAM role that will be used by the EKS cluster
const clusterRole = new aws.iam.Role(`${name}-eksRole`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        "Service": "eks.amazonaws.com"
    })
});

// Attach the Amazon EKS Cluster Policy to the Role
const clusterRolePolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-clusterRolePolicy`, {
    role: clusterRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
});

// Create an IAM role that will be used by the EKS worker nodes
const workerNodeRole = new aws.iam.Role(`${name}-workerNodeRole`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        "Service": "ec2.amazonaws.com"
    })
});

// Attach the Amazon EKS Worker Node Policy to the Worker Node Role
const workerNodePolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-workerNodePolicy`, {
    role: workerNodeRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
});

// Attach the Amazon EKS CNI Policy to the Worker Node Role
const workerCniPolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-workerCniPolicy`, {
    role: workerNodeRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
});

// Attach the Amazon EC2 Container Registry Read Only Policy to the Worker Node Role
const workerRegistryPolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-workerRegistryPolicy`, {
    role: workerNodeRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
});

// Attach the Amazon SSM Managed Instance Core Policy to the Worker Node Role
const workerSSMPolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-workerSSMPolicy`, {
    role: workerNodeRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
});
//creates a new Amazon EKS Cluster
const cluster = new eks.Cluster(name, {
    name: clusName,
    vpcId: vpc.vpcId.apply(id => id),
    privateSubnetIds: vpc.privateSubnetIds.apply(ids => [ids[0], ids[1]]), // Use the first two private subnets
    publicSubnetIds: vpc.publicSubnetIds.apply(ids => [ids[0], ids[1]]), // Use the first two public subnets
    instanceType: "t2.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    createOidcProvider: true,
    instanceRole: workerNodeRole,  // use the IAM role defined above for the worker nodes
});

//Export constants which can then be used by other scripts or operations
export const kubeconfig = cluster.kubeconfig
export const clusterName = clusName
export const vpcId = vpc.vpcId.apply(id => id)
export const clusterOidcProvider = cluster.core.oidcProvider?.url
export const clusterOidcProviderArn = cluster.core.oidcProvider?.arn

/***************************************************ARGOCD***********************************************************************/
/*
ArgoCD Deployment:
Creates a Kubernetes provider using the kubeconfig from the EKS cluster.
Deploys ArgoCD to the cluster using a Helm chart. The ArgoCD application is deployed to a new Kubernetes namespace called "argocd".
*/

// Create a K8s provider instance using the kubeconfig we got from the EKS cluster
const k8sProvider = new k8s.Provider(name, {
    kubeconfig: cluster.kubeconfig,
}, { dependsOn: [cluster] });

// Deploy ArgoCD using Helm chart
const argocdNamespace = new k8s.core.v1.Namespace("argocd", {
    metadata: {
        name: "argocd",
    },
}, { provider: k8sProvider });

const argocdChart = new k8s.helm.v3.Chart("argocd", {
    chart: "argo-cd",
    fetchOpts: {
        repo: "https://argoproj.github.io/argo-helm",
    },
    version: "3.9.0", // specify the version you want to install
    namespace: argocdNamespace.metadata.name,
    values: {
        // You can set custom values here, they will override the default values in the ArgoCD Helm chart.
        // For available values check: https://github.com/argoproj/argo-helm/tree/master/charts/argo-cd#values
    },
}, { provider: k8sProvider });

// Export the name of the ArgoCD Namespace
export const argoCDNamespace = argocdNamespace.metadata.name;