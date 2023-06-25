
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as fs from 'fs';
import { config } from 'dotenv'

config();

/***************************************************EKS CLUSTER***********************************************************************/
/*EKS Cluster Setup:
    - Imports required libraries (Pulumi, AWS, AWSX, EKS, Kubernetes).
    - Defines the name of the cluster and some related configuration.
    - Creates a Virtual Private Cloud (VPC) with 2 availability zones and a specific CIDR block.
    - Creates two IAM roles, one for the EKS cluster and one for the worker nodes.
    - Attaches necessary policies to these roles, allowing the cluster and nodes to function correctly.
    - Creates an EKS cluster in the VPC. The cluster uses "t2.medium" EC2 instances, with a minimum of 1 and a maximum of 2 instances. Also, it creates an OIDC provider and assigns the workerNodeRole to the instances.
*/

// const pulumiConfig = new pulumi.Config();
// const configValues = pulumi.all({
//     region: pulumiConfig.requireSecret("AWS_REGION"),
//     accountID: pulumiConfig.requireSecret("AWS_ACCOUNT_ID"),
//     cognitoUserPoolID: pulumiConfig.requireSecret("AWS_COGNITO_USER_POOL_ID")
// });



export function createEksCluster(name: string) {
    const clusName = `${name}`;
    const region = process.env.AWS_REGION;
    const accountID = process.env.AWS_ACCOUNT_ID;
    const cognitoUserPoolID = process.env.AWS_COGNITO_USER_POOL_ID;

    let subnetIds: pulumi.Output<string[]> | undefined;

    const vpc = new awsx.ec2.Vpc(`vpc-${clusName}`, {
        numberOfAvailabilityZones: 2, // Use only two AZs
        cidrBlock: "172.16.0.0/24",
        tags: {
            "alpha.eksctl.io/cluster-name": clusName,
            "alpha.eksctl.io/cluster-oidc-enabled": "false",
            "eksctl.cluster.k8s.io/v1alpha1/cluster-name": clusName,
            "alpha.eksctl.io/eksctl-version": "1.27",
            "Name": `${clusName}/VPC`
        },
    });

    // Create an IAM role that will be used by the EKS cluster
    const clusterRole = new aws.iam.Role(`${clusName}`, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            "Service": "eks.amazonaws.com"
        }),
        tags: {
            "Name": `${clusName}/ServiceRole`,
            // "alpha.eksctl.io/cluster-name": clusName,
            "alpha.eksctl.io/cluster-oidc-enabled": "false",
            "alpha.eksctl.io/eksctl-version": "1.27",
            //"eksctl.cluster.k8s.io/v1alpha1/cluster-name": clusName
        }
    });
    //Download veridid-nas-cluster-PolicyELBPermissions.json from files
    let policyDoc;
    try {
        policyDoc = fs.readFileSync("./files/veridid-nas-cluster-PolicyELBPermissions.json", "utf-8");
    } catch (error) {
        console.error('Error reading policy file', error);
        throw error;
    }
    // Define a new policy - PolicyELBPermissions
    const policyELBPermissions = new aws.iam.Policy(`${clusName}-PolicyELBPermissions`, {
        policy: policyDoc,
    }, { parent: clusterRole });

    // Attach the Amazon EKS Cluster Policy to the Role
    const clusterRolePolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-clusterRolePolicy`, {
        role: clusterRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
    }, { parent: clusterRole });

    // Attach the Amazon EKS VPC Resource Controller Policy to the Role
    const vpcResourceControllerPolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-vpcResourceControllerPolicy`, {
        role: clusterRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
    }, { parent: clusterRole });


    // Attach the new policy to the role (clusterRole)
    const policyELBPermissionsAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-lbPermissionPolicy`, {
        role: clusterRole.name,
        policyArn: policyELBPermissions.arn,
    }, { parent: clusterRole });

    // Create an IAM role that will be used by the EKS worker nodes
    const workerNodeRole = new aws.iam.Role(`${clusName}-workerNodeRole`, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            "Service": "ec2.amazonaws.com"
        })
    });

    const cognitoIdpPolicyDocument = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "cognito-idp:AdminInitiateAuth",
                "Resource": `arn:aws:cognito-idp:${region}:${accountID}:userpool/${cognitoUserPoolID}`
            }
        ]
    };

    // const cognitoIdpPolicyDocument = configValues.apply(({ region, accountID, cognitoUserPoolID }) => ({
    //     "Version": "2012-10-17",
    //     "Statement": [
    //         {
    //             "Effect": "Allow",
    //             "Action": "cognito-idp:AdminInitiateAuth",
    //             "Resource": pulumi.interpolate`arn:aws:cognito-idp:${region}:${accountID}:userpool/${cognitoUserPoolID}`
    //         }
    //     ]
    // }));


    //const cognitoIdpPolicyDocumentString = cognitoIdpPolicyDocument.apply(doc => JSON.stringify(doc));
    //const cognitoIdpPolicyDocumentString = JSON.stringify(cognitoIdpPolicyDocument);


    const cognitoIdpPolicy = new aws.iam.Policy(`${clusName}-cognitoIdpPolicy`, {
        policy: JSON.stringify(cognitoIdpPolicyDocument),
    }, { parent: workerNodeRole });

    // Attach the cognito-idp:AdminInitiateAuth Policy to teh Worker Node Role
    const workerNodeCognitoIdpPolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-workerCognitoIdpPolicy`, {
        role: workerNodeRole.name,
        policyArn: cognitoIdpPolicy.arn,
    }, { parent: workerNodeRole });


    // Attach the Amazon EKS Worker Node Policy to the Worker Node Role
    const workerNodePolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-workerNodePolicy`, {
        role: workerNodeRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
    }, { parent: workerNodeRole });
    // Attach the Amazon EKS CNI Policy to the Worker Node Role
    const workerCniPolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-workerCniPolicy`, {
        role: workerNodeRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
    });
    // Attach the Amazon EC2 Container Registry Read Only Policy to the Worker Node Role
    const workerRegistryPolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-workerRegistryPolicy`, {
        role: workerNodeRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
    }, { parent: workerNodeRole });
    // Attach the Amazon SSM Managed Instance Core Policy to the Worker Node Role
    const workerSSMPolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-workerSSMPolicy`, {
        role: workerNodeRole.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
    }, { parent: workerNodeRole });


    const elasticloadbalancingPolicyDocument = {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: "elasticloadbalancing:DescribeLoadBalancers",
                Resource: "*",
            },
        ],
    };
    const elasticloadbalancingPolicy = new aws.iam.Policy(`${clusName}-elasticloadbalancingPolicy`, {
        policy: JSON.stringify(elasticloadbalancingPolicyDocument),
    }, { parent: workerNodeRole });
    const workerNodeRolePolicyAttachment = new aws.iam.RolePolicyAttachment(`${clusName}-elasticloadbalancingPolicy`, {
        role: workerNodeRole.name,
        policyArn: elasticloadbalancingPolicy.arn,
    }, { parent: workerNodeRole });



    //creates a new Amazon EKS Cluster
    const cluster = new eks.Cluster(clusName, {
        vpcId: vpc.vpcId.apply(id => id),
        privateSubnetIds: vpc.privateSubnetIds.apply(ids => [ids[0], ids[1]]), // Use the first two private subnets
        publicSubnetIds: vpc.publicSubnetIds.apply(ids => [ids[0], ids[1]]), // Use the first two public subnets
        instanceType: "t2.medium",
        desiredCapacity: 2,
        minSize: 1,
        maxSize: 2,
        createOidcProvider: true,
        serviceRole: clusterRole,
        instanceRole: workerNodeRole,  // use the IAM role defined above for the worker nodes
        tags: {
            "alpha.eksctl.io/cluster-name": clusName,
            "eksctl.cluster.k8s.io/v1alpha1/cluster-name": clusName,
            "alpha.eksctl.io/cluster-oidc-enabled": "true",
            "alpha.eksctl.io/eksctl-version": "1.27",
            "Name": `${clusName}/ControlPlane`
        },
    });

    vpc.vpcId.apply(vpcId => {
        let getSubnetsArgs: aws.ec2.GetSubnetsArgs = {
            filters: [{
                name: "vpc-id",
                values: [vpcId]
            }]
        };

        subnetIds = pulumi.output(aws.ec2.getSubnets(getSubnetsArgs).then(res => res.ids));
        subnetIds?.apply(ids => {
            ids.forEach(id => {
                new aws.ec2.Tag(`cluster-tag-${id}`, {
                    key: `kubernetes.io/cluster/${clusName}`,
                    value: "shared",
                    resourceId: id,
                });
                new aws.ec2.Tag(`role-tag-${id}`, {
                    key: `kubernetes.io/role/internal-elb`,
                    value: "1",
                    resourceId: id,
                });
                new aws.ec2.Tag(`tag-${id}`, {
                    key: "alpha.eksctl.io/cluster-name",
                    value: clusName,
                    resourceId: id,
                });
                new aws.ec2.Tag(`oidc-tag-${id}`, {
                    key: "alpha.eksctl.io/cluster-oidc-enabled",
                    value: "false",
                    resourceId: id,
                });
                new aws.ec2.Tag(`cluster-name-tag-${id}`, {
                    key: "eksctl.cluster.k8s.io/v1alpha1/cluster-name",
                    value: clusName,
                    resourceId: id,
                });
                new aws.ec2.Tag(`version-tag-${id}`, {
                    key: "alpha.eksctl.io/eksctl-version",
                    value: "1.27",
                    resourceId: id,
                });
                new aws.ec2.Tag(`elb-tag-${id}`, {
                    key: "kubernetes.io/role/elb",
                    value: "1",
                    resourceId: id,
                });
                new aws.ec2.Tag(`name-tag-${id}`, {
                    key: "Name",
                    value: `${clusName}/${id}`,
                    resourceId: id,
                });
            });
        });

    });
    // Export constants which can then be used by other scripts or operations
    return {
        vpc,
        vpcId: vpc.vpcId.apply(id => id),
        privateSubnetIds: vpc.privateSubnetIds.apply(ids => [ids[0], ids[1]]),
        publicSubnetIds: vpc.publicSubnetIds.apply(ids => [ids[0], ids[1]]),
        kubeconfig: cluster.kubeconfig,
        clusterOidcProvider: cluster.core.oidcProvider?.url,
        clusterOidcProviderArn: cluster.core.oidcProvider?.arn,
        clusterName: clusName,
        cluster: cluster,
        subnetIds: subnetIds?.apply(ids => ids)

    }
}