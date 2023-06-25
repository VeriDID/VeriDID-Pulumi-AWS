import * as pulumi from "@pulumi/pulumi";
import { createEksCluster } from './components/eksCluster';
import { setupAwsLoadBalancerController } from "./components/awsLoadBalancerController";
import { setupArgoCD } from './components/argoCD';
import { createIngress, getLoadBalancerName, getListenerArn } from "./components/ingress";
import { createK8sProvider } from './components/k8sProvider';
import { createApiGatewayWithVpcLink } from './components/apiGateway';
import { createVpcLinkSecurityGroup } from './components/securityGroup';
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
//Create EKS Cluster
const name = config.get("NAME") || 'veridid';
const {
    privateSubnetIds,
    vpcId,
    kubeconfig,
    clusterOidcProvider,
    clusterOidcProviderArn,
    clusterName,
    cluster,
    subnetIds
} = createEksCluster(name);

// Create a K8s provider instance using the kubeconfig we got from the EKS cluster
const k8sProvider = createK8sProvider(name, cluster);


// Setup AWS Load Balancer Controller
const loadBalancerController = setupAwsLoadBalancerController(k8sProvider);

// Setup ArgoCD
const { argocdApp } = setupArgoCD(k8sProvider);

// Set up Ingress
const afjTestIngress = createIngress(k8sProvider, argocdApp);

// Get the Load Balancer DNS name and ARN
const lbNameOutput = getLoadBalancerName(afjTestIngress);



// //Create Cognito User Pool
// const { userPool, userAdminNas, userNas } = createCognitoUserPool(name);

let vpcLinkSecurityGroup = createVpcLinkSecurityGroup("veridid-nas-vpclink", vpcId);

// Use the returned Security Group ID
//console.log(vpcLinkSecurityGroup.securityGroupId);
const securityGroupId = vpcLinkSecurityGroup?.securityGroupId
const securityGroupIds: pulumi.Output<string>[] = [securityGroupId];

// Create API Gateway with VPC Link
/* ************************************************************************************************ */
// Use the load balancer name to get the load balancer ARN
const lbArnOutput = lbNameOutput.apply(lbName => {
    return aws.lb.getLoadBalancer({ name: lbName })
        .then(lb => lb.arn)
        .catch(err => { throw new Error(`Failed to get the load balancer: ${err}`); });
});

// Fetch loadBalancerListener ARN
const loadBalancerListenerARN = lbArnOutput.apply(arn => {
    return getListenerArn(80, arn);
});
const loadBalancerListenerArnString = loadBalancerListenerARN.apply(listener => listener.arn);

/* ************************************************************************************************ */

const subnetIdsOutput: pulumi.Output<string[]> = subnetIds || pulumi.output([]);
const apiGateway = loadBalancerListenerArnString.apply(listenerarn => {
    return createApiGatewayWithVpcLink('veridid-nas-pulumi', listenerarn, privateSubnetIds, securityGroupIds)
});




// Export EKS Cluster and ArgoCD details.
export {
    vpcId,
    kubeconfig,
    clusterOidcProvider,
    clusterOidcProviderArn,
    clusterName,
    apiGateway,
    loadBalancerListenerArnString,
    privateSubnetIds
}
