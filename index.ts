import * as pulumi from "@pulumi/pulumi";
import { createEksCluster } from './components/eksCluster';
import { setupAwsLoadBalancerController } from "./components/awsLoadBalancerController";
import { config } from 'dotenv';
import { setupArgoCD } from './components/argoCD';
import { createIngress } from "./components/ingress";
import { createK8sProvider } from './components/k8sProvider';
import { createCognitoUserPool } from './components/cognitoUserPool';

config();

//Create EKS Cluster
const name = process.env.NAME || 'veridid';
const {
    vpcId,
    kubeconfig,
    clusterOidcProvider,
    clusterOidcProviderArn,
    clusterName,
    cluster,
    subnetIds
} = createEksCluster(name);

// Create a K8s provider instance using the kubeconfig we got from the EKS cluster
// const k8sProvider = new k8s.Provider(name, {
//     kubeconfig: cluster.kubeconfig,
// }, { dependsOn: [cluster] });
// Create a K8s provider instance using the kubeconfig we got from the EKS cluster
const k8sProvider = createK8sProvider(name, cluster);


// Setup AWS Load Balancer Controller
const loadBalancerController = setupAwsLoadBalancerController(k8sProvider);

// Setup ArgoCD
const { argocdNamespace, argocdChart, namespace, dockerSecret, cognitoSecret, argocdApp } = setupArgoCD(k8sProvider);

// Set up Ingress
const afjTestIngress = createIngress(k8sProvider, argocdApp);

 //Create Cognito User Pool
//const cognitoUserPool = createCognitoUserPool(name);


// Export EKS Cluster and ArgoCD details.
export {
    vpcId,
    kubeconfig,
    clusterOidcProvider,
    clusterOidcProviderArn,
    clusterName,
    subnetIds,
}
