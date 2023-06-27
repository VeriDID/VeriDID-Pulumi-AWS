<p align="center">
  <br />
  <img
    alt="VeriDID logo"
    src="https://github.com/VeriDID/VeriDID-Pulumi-AWS/blob/main/VeriDID_Logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>VeriDID Infrastructure with Pulumi and AWS</b></h1>
<p align="center">
   <a href="https://www.typescriptlang.org/"
    ><img
      alt="typescript"
      src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg"
  /></a>
  

## Project Overview

This project utilizes [Pulumi](https://www.pulumi.com/) to define, manage and deploy an AWS EKS cluster and its associated infrastructure. It also deploys [ArgoCD](https://argoproj.github.io/argo-cd/), a declarative GitOps continuous delivery tool for Kubernetes, onto the EKS cluster.

The EKS cluster is created within a VPC with 2 availability zones, utilizing a specific CIDR block. The cluster employs "t2.medium" EC2 instances with a minimum of 1 and a maximum of 2 instances.

Four specific AWS policies are attached to the worker nodes to ensure the correct functioning of the cluster:

* Amazon EKS Worker Node Policy
* Amazon EKS CNI Policy
* Amazon EC2 Container Registry Read Only Policy
* Amazon SSM Managed Instance Core Policy

# Project Structure

The **VeriDID-Pulumi-AWS** project contains the following folders and files:

<pre>
📁 <b>VeriDID-Pulumi-AWS</b>
├── 📝 index.ts
│
├── 📁 <b>1_components</b>
│   ├── 📝 apiGateway.ts
│   ├── 📝 argoCD.ts
│   ├── 📝 awsLoadBalancerController.ts
│   ├── 📝 eksCluster.ts
│   ├── 📝 ingress.ts
│   ├── 📝 k8sProvider.ts
│   ├── 📝 securityGroup.ts
│   └── 📁 secrets
│       ├── 📝 cognitoSecret.ts
│       └── 📝 dockerSecret.ts
│   
├── 📁 <b>2_config</b>
│   └── 📝 configArgoCD.ts
│   
└── 📁 <b>3_files</b>
    ├── 📝 awsLoadBalancerController_policy.json
    └── 📝 veridid-nas-cluster-PolicyELBPermissions.json
</pre>

![Flow Diagram](https://github.com/Nas2020/VeriDID-Pulumi-AWS/blob/main/Veridid-Pulumi-Process-Flow.png)


## Prerequisites

Before you begin, ensure you have met the following requirements:

* Installed [Node.js](https://nodejs.org/en/).
* Installed [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).
* An active [AWS](https://aws.amazon.com/) account with necessary permissions.
* Installed and configured [AWS CLI](https://aws.amazon.com/cli/).

## Getting Started

To install and deploy the project, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/VeriDID/VeriDID-Pulumi-AWS.git
```

2. Navigate to the project directory:

```bash
cd veriDID-Pulumi-AWS
```
3. Install the dependencies:

```bash
npm install
```
4. Set up credentials and and secrets:

```bash
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_REGION=<aws-region> 
```

```bash
pulumi config set NAME <value>
pulumi config set dockerRegistryUsername <value>
pulumi config set --secret githubToken <github-token>
```

```bash
pulumi config set --secret AWS_COGNITO_USER_POOL_ID <value>
pulumi config set --secret AWS_COGNITO_CLIENT_ID <value>
pulumi config set --secret AWS_REGION <aws-region>
pulumi config set --secret AWS_ACCOUNT_ID <aws-account-id>
```

```bash
Rename .env.sample to .env and fill in the required environment variables
```

5. Run pulumi up to preview and deploy changes:

```bash
pulumi up
```

6. Once the deployment is successful, fetch the kubeconfig file for the new cluster:

```bash
pulumi stack output kubeconfig | tee ~/.kube/config
```

7. Verify that your local kubectl can communicate with the new cluster:

```bash
kubectl get nodes
```

8. Open Pulumi UI in a web browser via the link displayed in your console to inspect your cluster details.

9. Set up port forwarding for ArgoCD:

```bash
kubectl port-forward -n argocd svc/argocd-server 8080:443
```
10. Navigate to ArgoCD's web interface through the link provided.

## Resources
- [Argocd to EKS](https://pulumi.awsworkshop.io/additional-content/150_deploying_argocd_to_eks.html)
- [ArgoCD](https://argoproj.github.io/argo-cd/)
- [Pulumi EKS Cluster setup](https://pulumi.awsworkshop.io/50_eks_platform/20_provision_cluster/1_new_project.html)
- [ArgoCD Introduction Video by Nana](https://www.youtube.com/watch?v=MeU5_k9ssrs)

